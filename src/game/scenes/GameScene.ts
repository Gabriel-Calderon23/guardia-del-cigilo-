import Phaser from "phaser";
import {
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
import { cellCenter, isWalkable, worldToCell, type GridPoint } from "../../domain/model/grid";
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
import type { SearchAlgorithm, SearchResult, SearchStatus } from "../../domain/navigation/search";
import { evaluateAlertLevel, type AlertConfig, type AlertLevel } from "../../domain/perception/alert";
import { timeSinceLastPerception } from "../../domain/perception/memory";
import type { VisionReason, VisionResult } from "../../domain/perception/perception";
import { ALERT_FEEDBACK, shouldTriggerAlertFeedback } from "../presentation/alertFeedback";
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
  private navigationGraphics!: Phaser.GameObjects.Graphics;
  private perceptionGraphics!: Phaser.GameObjects.Graphics;
  private targetMarker!: Phaser.GameObjects.Arc;
  private lastKnownMarker!: Phaser.GameObjects.Arc;
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
    this.cameras.main.setBackgroundColor("#10161c");
    this.cameras.main.resetFX();
    this.drawGrid();

    const walls = this.physics.add.staticGroup();
    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        if (!isWalkable(LAB_MAP, { x, y })) {
          const center = cellCenter({ x, y }, TILE_SIZE);
          const wall = this.add.rectangle(center.x, center.y, TILE_SIZE, TILE_SIZE, 0x27333d);
          wall.setStrokeStyle(1, 0x3a4c58);
          walls.add(wall);
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
    this.physics.add.collider(this.player, walls);

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
    this.patrolActive = false;
    this.patrolBlocked = false;
    this.pauseState = initialPatrolPause();
    this.navigationGoal = worldToCell({ x: pointer.worldX, y: pointer.worldY }, TILE_SIZE);
    this.renderNavigation();
  }

  private renderNavigation(): void {
    const guardCell = worldToCell({ x: this.guard.x, y: this.guard.y }, TILE_SIZE);
    const result = calculateRoute(
      LAB_MAP,
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
    const result = calculateRoute(LAB_MAP, guardCell, target, this.navigationAlgorithm);
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
      if (this.patrolActive) {
        if (!this.patrolBlocked) {
          this.beginPauseAtPatrolPoint();
        }
      } else if (this.guardWaypoints.length > 0) {
        this.resumePatrolAfterManual();
      }
    }
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
      map: LAB_MAP,
      tileSize: TILE_SIZE,
      observer,
      facing: this.guardFacing,
      target,
      visionRange: VISION_RANGE,
      fieldOfViewRadians: FIELD_OF_VIEW,
      timeMs: time,
    });
    this.perceptionState = frame.state;

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
      this.perceptionGraphics.lineStyle(2, 0xe5b454, 0.8);
      this.perceptionGraphics.strokeCircle(
        this.perceptionState.soundEvent.position.x,
        this.perceptionState.soundEvent.position.y,
        this.perceptionState.soundEvent.radius,
      );
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

    this.navigationHud.setText([
      ...this.navigationSummary,
      this.patrolTelemetryLine(),
      `alerta ${ALERT_LABELS[this.alertLevel]}`,
      `vision ${VISION_LABELS[vision.reason]}`,
      `sonido ${sound}`,
      memory,
    ]);
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
}
