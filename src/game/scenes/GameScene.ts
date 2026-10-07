import Phaser from "phaser";
import {
  DOOR_CELL,
  GUARD_START,
  GRID_HEIGHT,
  GRID_WIDTH,
  LAB_MAP,
  PATROL_POINTS,
  PLAYER_START,
  TILE_SIZE,
} from "../../application/simulation/labLevel";
import { calculateRoute } from "../../application/simulation/navigationDemo";
import {
  initialPerceptionState,
  updatePerceptionSimulation,
  withSoundEvent,
  type PerceptionSimulationState,
} from "../../application/simulation/perceptionSimulation";
import { cellCenter, isWalkable, worldToCell, type GridMap, type GridPoint } from "../../domain/model/grid";
import { canToggleDoor, withDoorState } from "../../domain/model/door";
import type { Vector2 } from "../../domain/model/vector";
import { advanceAlongPath } from "../../domain/navigation/pathFollower";
import { nextPatrolPoint } from "../../domain/navigation/patrolRoute";
import {
  advancePause,
  initialPatrolPause,
  pauseGazeFacing,
  startPatrolPause,
  type PatrolPauseConfig,
  type PatrolPauseState,
} from "../../domain/navigation/pauseBehavior";
import {
  advanceInvestigation,
  arriveAtInvestigationTarget,
  initialInvestigation,
  shouldCancelInvestigation,
  shouldStartInvestigation,
  startInvestigation,
  type InvestigationConfig,
  type InvestigationState,
} from "../../domain/navigation/investigationBehavior";
import type { SearchAlgorithm, SearchResult, SearchStatus } from "../../domain/navigation/search";
import { evaluateAlertLevel, type AlertConfig, type AlertLevel } from "../../domain/perception/alert";
import {
  DISTRACTOR_CONFIG,
  canActivateDistractor,
  createDistractorSoundEvent,
} from "../../domain/perception/distractor";
import { timeSinceLastPerception } from "../../domain/perception/memory";
import type { VisionReason, VisionResult } from "../../domain/perception/perception";
import { ALERT_FEEDBACK, shouldTriggerAlertFeedback } from "../presentation/alertFeedback";
import { DISTRACTOR_STYLE, distractorOriginLabel } from "../presentation/distractorStyle";
import { DOOR_STYLE, doorStateLabel } from "../presentation/doorStyle";
import { visionStyleFor } from "../presentation/visionStyle";

const PLAYER_SPEED = 190;
const GUARD_SPEED = 115;
const VISION_RANGE = 220;
const FIELD_OF_VIEW = Math.PI / 2;
const SOUND_RADIUS = 190;
const SOUND_DURATION_MS = 800;
const PATROL_PAUSE_MS = 1500;
const GAZE_SWEEP_RADIANS = Math.PI / 3;
const PATROL_PAUSE_CONFIG: PatrolPauseConfig = {
  pauseMs: PATROL_PAUSE_MS,
  sweepRadians: GAZE_SWEEP_RADIANS,
};
const INVESTIGATION_CONFIG: InvestigationConfig = {
  inspectMs: PATROL_PAUSE_MS,
};
const SUSPICION_WINDOW_MS = 2000;
const ALERT_CONFIG: AlertConfig = { suspicionWindowMs: SUSPICION_WINDOW_MS };
const ALERT_LABELS: Readonly<Record<AlertLevel, string>> = {
  patrol: "PATRULLA",
  suspicion: "SOSPECHA",
  alert: "ALERTA",
};
const STATUS_LABELS: Readonly<Record<SearchStatus, string>> = {
  success: "EXITO",
  unreachable: "INALCANZABLE",
  "invalid-start": "INICIO INVALIDO",
  "invalid-goal": "DESTINO INVALIDO",
};
const VISION_LABELS: Readonly<Record<VisionReason, string>> = {
  visible: "VISIBLE",
  "out-of-range": "FUERA DE RANGO",
  "outside-cone": "FUERA DEL CONO",
  occluded: "OCLUIDO",
  "invalid-facing": "DIRECCION INVALIDA",
};

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private guard!: Phaser.GameObjects.Arc;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveUp!: Phaser.Input.Keyboard.Key;
  private moveDown!: Phaser.Input.Keyboard.Key;
  private moveLeft!: Phaser.Input.Keyboard.Key;
  private moveRight!: Phaser.Input.Keyboard.Key;
  private reset!: Phaser.Input.Keyboard.Key;
  private toggleAlgorithm!: Phaser.Input.Keyboard.Key;
  private emitSound!: Phaser.Input.Keyboard.Key;
  private toggleDistractor!: Phaser.Input.Keyboard.Key;
  private navigationGraphics!: Phaser.GameObjects.Graphics;
  private perceptionGraphics!: Phaser.GameObjects.Graphics;
  private targetMarker!: Phaser.GameObjects.Arc;
  private lastKnownMarker!: Phaser.GameObjects.Arc;
  private distractorMarker!: Phaser.GameObjects.Arc;
  private navigationHud!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private navigationAlgorithm: SearchAlgorithm = "astar";
  private navigationGoal: GridPoint = GUARD_START;
  private navigationSummary: readonly string[] = [];
  private guardFacing: Vector2 = { x: -1, y: 0 };
  private guardWaypoints: readonly Vector2[] = [];
  private nextWaypoint = 0;
  private patrolActive = true;
  private patrolBlocked = false;
  private patrolIndex = 0;
  private pauseState: PatrolPauseState = initialPatrolPause();
  private perceptionState: PerceptionSimulationState = initialPerceptionState();
  private alertLevel: AlertLevel = "patrol";
  private investigationState: InvestigationState = initialInvestigation();
  private investigationNotice = "";
  private distractorArmed = false;
  private lastDistractorAtMs: number | null = null;
  private distractorCell: GridPoint | null = null;
  private distractorNotice = "";
  private toggleDoor!: Phaser.Input.Keyboard.Key;
  private doorArmed = false;
  private doorClosed = false;
  private doorNotice = "";
  private doorRect: Phaser.GameObjects.Rectangle | null = null;
  private currentMap: GridMap = LAB_MAP;
  private walls!: Phaser.Physics.Arcade.StaticGroup;

  public constructor() {
    super("GameScene");
  }

  public create(): void {
    this.navigationAlgorithm = "astar";
    this.navigationGoal = GUARD_START;
    this.guardFacing = { x: -1, y: 0 };
    this.guardWaypoints = [];
    this.nextWaypoint = 0;
    this.patrolActive = true;
    this.patrolBlocked = false;
    this.patrolIndex = 0;
    this.pauseState = startPatrolPause(this.guardFacing, PATROL_PAUSE_CONFIG);
    this.perceptionState = initialPerceptionState();
    this.alertLevel = "patrol";
    this.investigationState = initialInvestigation();
    this.investigationNotice = "";
    this.distractorArmed = false;
    this.lastDistractorAtMs = null;
    this.distractorCell = null;
    this.distractorNotice = "";
    this.doorArmed = false;
    this.doorClosed = false;
    this.doorNotice = "";
    this.doorRect = null;
    this.currentMap = LAB_MAP;
    this.cameras.main.setBackgroundColor("#10161c");
    this.cameras.main.resetFX();
    this.drawGrid();

    this.walls = this.physics.add.staticGroup();
    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        if (!isWalkable(this.currentMap, { x, y })) {
          const center = cellCenter({ x, y }, TILE_SIZE);
          const wall = this.add.rectangle(center.x, center.y, TILE_SIZE, TILE_SIZE, 0x27333d);
          wall.setStrokeStyle(1, 0x3a4c58);
          this.walls.add(wall);
        }
      }
    }

    const spawn = cellCenter(PLAYER_START, TILE_SIZE);
    this.player = this.add.rectangle(spawn.x, spawn.y, 20, 20, 0xe5b454);
    this.player.setStrokeStyle(2, 0xffd98a);
    this.player.setDepth(4);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.walls);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }

    this.cursors = keyboard.createCursorKeys();
    this.moveUp = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.moveDown = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.moveLeft = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.moveRight = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.reset = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.toggleAlgorithm = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.emitSound = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.toggleDistractor = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.toggleDoor = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);

    this.perceptionGraphics = this.add.graphics().setDepth(1);
    this.navigationGraphics = this.add.graphics().setDepth(2);
    const guardPosition = cellCenter(GUARD_START, TILE_SIZE);
    this.guard = this.add
      .circle(guardPosition.x, guardPosition.y, 11, 0x6b8afd)
      .setStrokeStyle(2, 0xb9c5ff)
      .setDepth(4);
    this.targetMarker = this.add
      .circle(0, 0, 10, 0x000000, 0)
      .setStrokeStyle(3, 0x73c991)
      .setDepth(5);
    this.lastKnownMarker = this.add
      .circle(0, 0, 7, 0x000000, 0)
      .setStrokeStyle(2, 0xe16969)
      .setDepth(5)
      .setVisible(false);
    this.distractorMarker = this.add
      .circle(0, 0, DISTRACTOR_STYLE.markerRadius, 0x000000, 0)
      .setStrokeStyle(
        2,
        DISTRACTOR_STYLE.markerColor,
        DISTRACTOR_STYLE.markerAlpha,
      )
      .setDepth(5)
      .setVisible(false);

    this.titleText = this.add
      .text(16, 14, "H3 / PERCEPCION Y MOVIMIENTO", {
        color: "#9eb4c2",
        fontFamily: "monospace",
        fontSize: "14px",
      })
      .setDepth(10);

    this.navigationHud = this.add
      .text(GRID_WIDTH * TILE_SIZE - 16, 14, "", {
        align: "right",
        backgroundColor: "#10161ccc",
        color: "#d9e4ea",
        fontFamily: "monospace",
        fontSize: "13px",
        padding: { x: 8, y: 6 },
      })
      .setOrigin(1, 0)
      .setDepth(10);

    this.input.on("pointerdown", this.handlePointerDown, this);
    this.renderPatrolLeg();
    this.updatePerception(0);

    this.uiCamera = this.cameras.add(
      0,
      0,
      GRID_WIDTH * TILE_SIZE,
      GRID_HEIGHT * TILE_SIZE,
    );
    this.cameras.main.ignore([this.titleText, this.navigationHud]);
    this.uiCamera.ignore(
      this.children.list.filter(
        (child) => child !== this.titleText && child !== this.navigationHud,
      ),
    );
  }

  public update(time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.reset)) {
      this.scene.restart();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.toggleAlgorithm)) {
      this.navigationAlgorithm = this.navigationAlgorithm === "astar" ? "bfs" : "astar";
      if (this.patrolActive) {
        this.renderPatrolLeg();
      } else {
        this.renderNavigation();
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.emitSound)) {
      this.perceptionState = withSoundEvent(this.perceptionState, {
        position: { x: this.player.x, y: this.player.y },
        radius: SOUND_RADIUS,
        emittedAtMs: time,
        durationMs: SOUND_DURATION_MS,
      });
    }

    if (Phaser.Input.Keyboard.JustDown(this.toggleDistractor)) {
      this.distractorArmed = !this.distractorArmed;
      this.distractorNotice = "";
    }

    if (Phaser.Input.Keyboard.JustDown(this.toggleDoor)) {
      this.doorArmed = !this.doorArmed;
      this.doorNotice = "";
    }

    const horizontal = Number(this.cursors.right.isDown || this.moveRight.isDown)
      - Number(this.cursors.left.isDown || this.moveLeft.isDown);
    const vertical = Number(this.cursors.down.isDown || this.moveDown.isDown)
      - Number(this.cursors.up.isDown || this.moveUp.isDown);
    const velocity = new Phaser.Math.Vector2(horizontal, vertical);

    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(PLAYER_SPEED);
    }

    this.playerBody.setVelocity(velocity.x, velocity.y);
    this.updateGuardMovement(delta);
    this.updatePerception(time);
  }

  private drawGrid(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x1b252d, 1);

    for (let x = 0; x <= GRID_WIDTH; x += 1) {
      graphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, GRID_HEIGHT * TILE_SIZE);
    }
    for (let y = 0; y <= GRID_HEIGHT; y += 1) {
      graphics.lineBetween(0, y * TILE_SIZE, GRID_WIDTH * TILE_SIZE, y * TILE_SIZE);
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.distractorArmed) {
      this.activateDistractor(pointer);
      return;
    }

    if (this.doorArmed) {
      this.toggleDoorAt(pointer);
      return;
    }

    this.patrolActive = false;
    this.patrolBlocked = false;
    this.pauseState = initialPatrolPause();
    this.investigationState = initialInvestigation();
    this.investigationNotice = "";
    this.navigationGoal = worldToCell({ x: pointer.worldX, y: pointer.worldY }, TILE_SIZE);
    this.renderNavigation();
  }

  /**
   * Activa el distractor en la celda apuntada. Sólo modifica la percepción
   * (evento de sonido) y la telemetría; no mueve al guardia: eso corresponde al
   * incremento de investigación.
   */
  private activateDistractor(pointer: Phaser.Input.Pointer): void {
    const cell = worldToCell({ x: pointer.worldX, y: pointer.worldY }, TILE_SIZE);
    if (!isWalkable(this.currentMap, cell)) {
      this.distractorNotice = "CELDA INVALIDA";
      return;
    }
    if (!canActivateDistractor(this.lastDistractorAtMs, this.time.now, DISTRACTOR_CONFIG)) {
      this.distractorNotice = "EN ENFRIAMIENTO";
      return;
    }

    this.perceptionState = withSoundEvent(
      this.perceptionState,
      createDistractorSoundEvent(this.currentMap, cell, TILE_SIZE, DISTRACTOR_CONFIG, this.time.now),
    );
    this.lastDistractorAtMs = this.time.now;
    this.distractorCell = cell;
    this.distractorNotice = "ACTIVO";
  }

  /**
   * Alterna la celda-puerta cuando el modo puerta (F) está armado. Sólo
   * `DOOR_CELL` puede alternarse y el cierre se valida contra la ocupación de
   * guardia y jugador. La replanificación de la ruta activa llega en el
   * incremento 4.
   */
  private toggleDoorAt(pointer: Phaser.Input.Pointer): void {
    const cell = worldToCell({ x: pointer.worldX, y: pointer.worldY }, TILE_SIZE);
    if (cell.x !== DOOR_CELL.x || cell.y !== DOOR_CELL.y) {
      this.doorNotice = "SOLO PUERTA";
      return;
    }

    const playerCell = worldToCell({ x: this.player.x, y: this.player.y }, TILE_SIZE);
    const guardCell = worldToCell({ x: this.guard.x, y: this.guard.y }, TILE_SIZE);
    const decision = canToggleDoor(this.currentMap, DOOR_CELL, [playerCell, guardCell]);
    if (decision === "occupied") {
      this.doorNotice = "CELDA OCUPADA";
      return;
    }
    if (decision === "out-of-bounds") {
      this.doorNotice = "SOLO PUERTA";
      return;
    }
    this.setDoorClosed(!this.doorClosed);
  }

  /** Aplica el nuevo estado de la puerta: mapa vivo, rectángulo en `walls` y HUD. */
  private setDoorClosed(closed: boolean): void {
    const result = withDoorState(this.currentMap, DOOR_CELL, closed);
    if (!result.ok) {
      this.doorNotice = "SOLO PUERTA";
      return;
    }

    this.currentMap = result.map;
    this.doorClosed = closed;
    this.doorNotice = "";

    if (closed) {
      const center = cellCenter(DOOR_CELL, TILE_SIZE);
      const rect = this.add.rectangle(
        center.x,
        center.y,
        TILE_SIZE,
        TILE_SIZE,
        DOOR_STYLE.closedCellColor,
      );
      rect.setStrokeStyle(DOOR_STYLE.markerLineWidth, DOOR_STYLE.markerColor);
      this.walls.add(rect);
      this.uiCamera.ignore(rect);
      this.doorRect = rect;
    } else if (this.doorRect) {
      this.walls.remove(this.doorRect, true, true);
      this.doorRect = null;
    }

    this.replanAfterDoorChange();
  }

  /**
   * Recalcula la ruta activa sobre `currentMap` inmediatamente después de
   * alternar la puerta (sólo en el evento del clic, sin bucles por fotograma):
   * patrulla activa → leg de patrulla con `patrolBlocked` si fracasa; ruta
   * manual → `renderNavigation`; investigación en tránsito → recálculo hacia
   * `targetCell` y, si falla, cancelación con aviso y retoma de patrulla (A2).
   * En pausa o inspección no hay ruta activa: el recálculo ocurre al salir
   * (precedente `updateGuardPause` / `updateInvestigationInspect`).
   */
  private replanAfterDoorChange(): void {
    if (this.investigationState.phase === "traveling") {
      this.replanInvestigation();
      return;
    }
    if (
      this.pauseState.phase === "paused"
      || this.investigationState.phase === "inspecting"
    ) {
      return;
    }
    if (this.patrolActive) {
      this.renderPatrolLeg();
      return;
    }
    this.renderNavigation();
  }

  /** Recálculo de una investigación en tránsito hacia su objetivo (A2 de la spec). */
  private replanInvestigation(): void {
    const target = this.investigationState.targetCell;
    if (!target) {
      this.cancelInvestigation();
      return;
    }

    const guardCell = worldToCell({ x: this.guard.x, y: this.guard.y }, TILE_SIZE);
    const result = calculateRoute(this.currentMap, guardCell, target, this.navigationAlgorithm);
    if (result.status === "success") {
      this.renderRoute(result, target, " / INVESTIGAR");
      return;
    }

    this.investigationState = initialInvestigation();
    this.investigationNotice = `RUTA BLOQUEADA (${STATUS_LABELS[result.status]})`;
    this.renderPatrolLeg();
  }

  private renderNavigation(): void {
    const guardCell = worldToCell({ x: this.guard.x, y: this.guard.y }, TILE_SIZE);
    const result = calculateRoute(
      this.currentMap,
      guardCell,
      this.navigationGoal,
      this.navigationAlgorithm,
    );
    this.renderRoute(result, this.navigationGoal, "");
  }

  private renderPatrolLeg(): void {
    this.patrolActive = true;
    const target = nextPatrolPoint(PATROL_POINTS, this.patrolIndex);
    const guardCell = worldToCell({ x: this.guard.x, y: this.guard.y }, TILE_SIZE);
    const result = calculateRoute(this.currentMap, guardCell, target, this.navigationAlgorithm);
    this.patrolBlocked = result.status !== "success";
    this.renderRoute(result, target, " / PATRULLA");
  }

  private renderRoute(result: SearchResult, goal: GridPoint, suffix: string): void {
    this.drawSearchResult(result);
    this.guardWaypoints = result.status === "success"
      ? result.path.map((point) => cellCenter(point, TILE_SIZE))
      : [];
    this.nextWaypoint = 0;

    const targetPosition = cellCenter(goal, TILE_SIZE);
    this.targetMarker.setPosition(targetPosition.x, targetPosition.y);
    this.targetMarker.setStrokeStyle(3, result.status === "success" ? 0x73c991 : 0xe16969);

    const cost = result.totalCost === null ? "-" : String(result.totalCost);
    const algorithm = result.algorithm === "astar" ? "A*" : "BFS";
    this.navigationSummary = [
      `${algorithm} / ${STATUS_LABELS[result.status]}${suffix}`,
      `costo ${cost} | expandidos ${result.expandedNodes}`,
      `frontera maxima ${result.maximumFrontier}`,
    ];
  }

  private drawSearchResult(result: SearchResult): void {
    this.navigationGraphics.clear();
    this.navigationGraphics.fillStyle(0x3b819c, 0.22);
    for (const point of result.explored) {
      this.navigationGraphics.fillRect(
        point.x * TILE_SIZE + 3,
        point.y * TILE_SIZE + 3,
        TILE_SIZE - 6,
        TILE_SIZE - 6,
      );
    }

    const firstPoint = result.path[0];
    if (!firstPoint) {
      return;
    }

    const firstCenter = cellCenter(firstPoint, TILE_SIZE);
    this.navigationGraphics.lineStyle(4, 0x62d0e8, 0.9);
    this.navigationGraphics.beginPath();
    this.navigationGraphics.moveTo(firstCenter.x, firstCenter.y);
    for (const point of result.path.slice(1)) {
      const center = cellCenter(point, TILE_SIZE);
      this.navigationGraphics.lineTo(center.x, center.y);
    }
    this.navigationGraphics.strokePath();
  }

  private updateGuardMovement(delta: number): void {
    if (this.pauseState.phase === "paused") {
      this.updateGuardPause(delta);
      return;
    }
    if (this.investigationState.phase === "inspecting") {
      this.updateInvestigationInspect(delta);
      return;
    }

    const previous = { x: this.guard.x, y: this.guard.y };
    const movement = advanceAlongPath(
      previous,
      this.guardWaypoints,
      this.nextWaypoint,
      GUARD_SPEED * delta / 1000,
    );
    this.nextWaypoint = movement.nextWaypoint;
    this.guard.setPosition(movement.position.x, movement.position.y);

    if (movement.direction) {
      this.guardFacing = movement.direction;
    }

    if (movement.completed) {
      if (this.investigationState.phase === "traveling") {
        this.investigationState = arriveAtInvestigationTarget(
          this.investigationState,
          INVESTIGATION_CONFIG,
        );
      } else if (this.patrolActive) {
        if (!this.patrolBlocked) {
          this.beginPauseAtPatrolPoint();
        }
      } else if (this.guardWaypoints.length > 0) {
        this.resumePatrolAfterManual();
      }
    }
  }

  private updateInvestigationInspect(delta: number): void {
    this.investigationState = advanceInvestigation(
      this.investigationState,
      delta,
      INVESTIGATION_CONFIG,
    );
    if (this.investigationState.phase === "idle") {
      this.investigationNotice = "";
      this.renderPatrolLeg();
    }
  }

  /**
   * Fija la investigación hacia la posición del ruido: valida la celda, calcula
   * la ruta con A* / BFS y la enruta con `renderRoute`. Un destino inalcanzable
   * produce un fracaso explícito (C-10) sin cambiar de fase: el guardia retoma
   * su conducta actual.
   */
  private beginInvestigation(position: Vector2): void {
    const cell = worldToCell(position, TILE_SIZE);
    const guardCell = worldToCell({ x: this.guard.x, y: this.guard.y }, TILE_SIZE);
    const result = calculateRoute(this.currentMap, guardCell, cell, this.navigationAlgorithm);
    if (result.status !== "success") {
      this.investigationNotice = `RUIDO INALCANZABLE (${result.status})`;
      return;
    }
    this.investigationState = startInvestigation(cell, INVESTIGATION_CONFIG);
    this.pauseState = initialPatrolPause();
    this.renderRoute(result, cell, " / INVESTIGAR");
  }

  /** Aborta una investigación en curso y retoma la patrulla desde el índice actual. */
  private cancelInvestigation(): void {
    this.investigationState = initialInvestigation();
    this.investigationNotice = "";
    this.renderPatrolLeg();
  }

  private updateGuardPause(delta: number): void {
    this.pauseState = advancePause(this.pauseState, delta, PATROL_PAUSE_CONFIG);
    const gaze = pauseGazeFacing(this.pauseState, PATROL_PAUSE_CONFIG);
    if (gaze) {
      this.guardFacing = gaze;
    }
    if (this.pauseState.phase === "walking") {
      this.renderPatrolLeg();
    }
  }

  private beginPauseAtPatrolPoint(): void {
    this.patrolIndex = (this.patrolIndex + 1) % PATROL_POINTS.length;
    this.pauseState = startPatrolPause(this.guardFacing, PATROL_PAUSE_CONFIG);
    this.guardWaypoints = [];
    this.nextWaypoint = 0;
  }

  private resumePatrolAfterManual(): void {
    this.renderPatrolLeg();
  }

  private updatePerception(time: number): void {
    const observer = { x: this.guard.x, y: this.guard.y };
    const target = { x: this.player.x, y: this.player.y };
    const frame = updatePerceptionSimulation(this.perceptionState, {
      map: this.currentMap,
      tileSize: TILE_SIZE,
      observer,
      facing: this.guardFacing,
      target,
      visionRange: VISION_RANGE,
      fieldOfViewRadians: FIELD_OF_VIEW,
      timeMs: time,
    });
    this.perceptionState = frame.state;
    if (!frame.state.soundEvent) {
      this.distractorCell = null;
    }

    const signals = {
      visionVisible: frame.vision.visible,
      soundHeard: frame.soundHeard,
    };
    if (
      shouldStartInvestigation(this.investigationState, signals)
      && this.perceptionState.soundEvent
    ) {
      this.beginInvestigation(this.perceptionState.soundEvent.position);
    } else if (
      this.investigationState.phase !== "idle"
      && !signals.visionVisible
      && signals.soundHeard
      && this.perceptionState.soundEvent
    ) {
      const heardCell = worldToCell(this.perceptionState.soundEvent.position, TILE_SIZE);
      const target = this.investigationState.targetCell;
      const sameCell = target !== null
        && target.x === heardCell.x
        && target.y === heardCell.y;
      if (!sameCell) {
        this.beginInvestigation(this.perceptionState.soundEvent.position);
      }
    } else if (shouldCancelInvestigation(this.investigationState, signals)) {
      this.cancelInvestigation();
    }

    const nextAlertLevel = evaluateAlertLevel(
      {
        visionVisible: frame.vision.visible,
        soundHeard: frame.soundHeard,
        memoryAgeMs: timeSinceLastPerception(frame.state.memory, time),
      },
      ALERT_CONFIG,
    );
    if (shouldTriggerAlertFeedback(this.alertLevel, nextAlertLevel)) {
      this.triggerAlertFeedback();
    }
    this.alertLevel = nextAlertLevel;

    this.drawPerception(this.alertLevel);
    this.updateTelemetry(time, frame.vision, frame.soundHeard);
  }

  private triggerAlertFeedback(): void {
    const worldCamera = this.cameras.main;
    worldCamera.resetFX();
    worldCamera.shake(ALERT_FEEDBACK.shakeDurationMs, ALERT_FEEDBACK.shakeIntensity);
    this.flashCamera(worldCamera);
    this.uiCamera.resetFX();
    this.flashCamera(this.uiCamera);
  }

  private flashCamera(camera: Phaser.Cameras.Scene2D.Camera): void {
    camera.flash(
      ALERT_FEEDBACK.flashDurationMs,
      (ALERT_FEEDBACK.flashColor >> 16) & 0xff,
      (ALERT_FEEDBACK.flashColor >> 8) & 0xff,
      ALERT_FEEDBACK.flashColor & 0xff,
    );
  }

  private drawPerception(level: AlertLevel): void {
    this.perceptionGraphics.clear();
    const facingAngle = Math.atan2(this.guardFacing.y, this.guardFacing.x);
    const halfFieldOfView = FIELD_OF_VIEW / 2;
    const style = visionStyleFor(level);
    this.perceptionGraphics.fillStyle(style.color, style.alpha);
    this.perceptionGraphics.beginPath();
    this.perceptionGraphics.moveTo(this.guard.x, this.guard.y);
    this.perceptionGraphics.arc(
      this.guard.x,
      this.guard.y,
      VISION_RANGE,
      facingAngle - halfFieldOfView,
      facingAngle + halfFieldOfView,
    );
    this.perceptionGraphics.closePath();
    this.perceptionGraphics.fillPath();

    if (this.perceptionState.soundEvent) {
      this.perceptionGraphics.lineStyle(
        DISTRACTOR_STYLE.ringLineWidth,
        DISTRACTOR_STYLE.ringColor,
        DISTRACTOR_STYLE.ringAlpha,
      );
      this.perceptionGraphics.strokeCircle(
        this.perceptionState.soundEvent.position.x,
        this.perceptionState.soundEvent.position.y,
        this.perceptionState.soundEvent.radius,
      );
    }

    if (this.perceptionState.soundEvent && this.distractorCell) {
      const marker = cellCenter(this.distractorCell, TILE_SIZE);
      this.distractorMarker.setPosition(marker.x, marker.y).setVisible(true);
    } else {
      this.distractorMarker.setVisible(false);
    }

    const lastKnown = this.perceptionState.memory.lastKnownPosition;
    this.lastKnownMarker.setVisible(lastKnown !== null);
    if (lastKnown) {
      this.lastKnownMarker.setPosition(lastKnown.x, lastKnown.y);
    }
  }

  private updateTelemetry(time: number, vision: VisionResult, soundHeard: boolean): void {
    const age = timeSinceLastPerception(this.perceptionState.memory, time);
    const memory = age === null
      ? "memoria -"
      : `memoria ${this.perceptionState.memory.source} ${(age / 1000).toFixed(1)}s`;
    const sound = this.perceptionState.soundEvent
      ? (soundHeard ? "OIDO" : "FUERA DE RANGO")
      : "-";

    const lines = [
      ...this.navigationSummary,
      this.patrolTelemetryLine(),
      `alerta ${ALERT_LABELS[this.alertLevel]}`,
      `vision ${VISION_LABELS[vision.reason]}`,
      `sonido ${sound}`,
      memory,
      this.distractorTelemetryLine(),
      this.doorTelemetryLine(),
    ];
    const investigationLine = this.investigationTelemetryLine();
    if (investigationLine) {
      lines.push(investigationLine);
    }
    this.navigationHud.setText(lines);
  }

  private patrolTelemetryLine(): string {
    if (this.pauseState.phase === "paused") {
      const seconds = (this.pauseState.remainingMs / 1000).toFixed(1);
      const degrees = Math.round((GAZE_SWEEP_RADIANS * 180) / Math.PI);
      return `pausa ${seconds}s | barrido ±${degrees}°`;
    }
    if (this.patrolActive) {
      return this.patrolBlocked ? "patrulla bloqueada" : "patrulla";
    }
    return "ruta manual";
  }

  private distractorTelemetryLine(): string {
    const mode = this.distractorArmed ? "ARMADO" : "INACTIVO";
    const origin = this.distractorCell
      ? ` @${distractorOriginLabel(this.distractorCell)}`
      : "";
    return this.distractorNotice
      ? `distractor ${mode}${origin} | ${this.distractorNotice}`
      : `distractor ${mode}${origin}`;
  }

  private doorTelemetryLine(): string {
    const mode = this.doorArmed ? "ARMADO" : "INACTIVO";
    const state = doorStateLabel(DOOR_CELL, this.doorClosed);
    return this.doorNotice
      ? `${state} | ${mode} ${this.doorNotice}`
      : `${state} | ${mode}`;
  }

  private investigationTelemetryLine(): string {
    if (this.investigationState.phase === "traveling") {
      return this.investigationNotice
        ? `investigando | ${this.investigationNotice}`
        : "investigando";
    }
    if (this.investigationState.phase === "inspecting") {
      return `inspeccion ${(this.investigationState.remainingMs / 1000).toFixed(1)}s`;
    }
    return this.investigationNotice ? `investigando | ${this.investigationNotice}` : "";
  }
}
