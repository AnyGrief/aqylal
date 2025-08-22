import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import { submitResult } from "../../api";

interface MatchingPair {
  id: string;
  left: string;
  right: string;
  correct: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface GameTask {
  id: string;
  question: string;
  question_type: "quiz" | "true_false" | "pin_answer" | "matching";
  options: string[] | MatchingPair[];
  correct_answers: string[] | string | MatchingPair[];
  timer: number;
  points: number;
  image?: string | null;
  correct_position?: Position;
}

interface QuizGameProps {
  gameTasks: GameTask[];
  assignmentId: string;
}

const BUTTON_COLORS = [
  0xe57373, 0x64b5f6, 0xffb74d, 0x81c784, 0x4dd0e1, 0xba68c8, 0xb0bec5, 0xf06292,
];

const QuizGame: React.FC<QuizGameProps> = ({ gameTasks, assignmentId }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current!,
      physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
      scene: {},
      dom: { createContainer: true },
    };

    class QuizScene extends Phaser.Scene {
      gameTasks: GameTask[];
      startTime: number;
      currentQuestionIndex: number = 0;
      score: number = 0;
      timeLeft: number = 0;
      correctSound!: Phaser.Sound.BaseSound;
      wrongSound!: Phaser.Sound.BaseSound;
      scoreText!: Phaser.GameObjects.Text;
      questionText!: Phaser.GameObjects.Text;
      answerButtons: { button: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; circle: Phaser.GameObjects.Graphics }[] = [];
      timerText!: Phaser.GameObjects.Text;
      timerEvent?: Phaser.Time.TimerEvent;
      pinImage?: Phaser.GameObjects.Image;
      pinMarker?: Phaser.GameObjects.Graphics;
      matchingPairs: { left: Phaser.GameObjects.Text; right: Phaser.GameObjects.Text; line: Phaser.GameObjects.Line | null }[] = [];

      constructor() {
        super("QuizScene");
        this.gameTasks = gameTasks;
        this.startTime = Date.now();
      }

      preload() {
        this.load.image("background", "assets/background.png");
        this.load.audio("correct", "assets/correct.mp3");
        this.load.audio("wrong", "assets/wrong.mp3");
        this.gameTasks.forEach((task) => {
          if (task.image) this.load.image(task.id, task.image);
        });
      }

      create() {
        this.add.image(400, 300, "background").setDisplaySize(800, 600);
        this.correctSound = this.sound.add("correct");
        this.wrongSound = this.sound.add("wrong");
        this.scoreText = this.add.text(50, 50, "Очки: 0", { fontSize: "24px", color: "#ffffff" });
        this.setupQuestion();
      }

      setupQuestion() {
        this.clearPreviousQuestion();

        if (this.currentQuestionIndex >= this.gameTasks.length) {
          this.endGame();
          return;
        }

        const task = this.gameTasks[this.currentQuestionIndex];
        this.timeLeft = task.timer;
        this.timerText = this.add.text(700, 50, `Время: ${this.timeLeft}`, { fontSize: "24px", color: "#ffffff" });
        this.timerEvent = this.time.addEvent({
          delay: 1000,
          callback: this.updateTimer,
          callbackScope: this,
          loop: true,
        });

        this.questionText = this.add.text(400, 100, task.question, {
          fontSize: "28px",
          color: "#ffffff",
          wordWrap: { width: 700 },
        }).setOrigin(0.5);

        if (task.question_type === "quiz" || task.question_type === "true_false") {
          this.setupQuizOrTrueFalse(task);
        } else if (task.question_type === "pin_answer") {
          this.setupPinAnswer(task);
        } else if (task.question_type === "matching") {
          this.setupMatching(task);
        }
      }

      clearPreviousQuestion() {
        this.questionText?.destroy();
        this.answerButtons.forEach((btn) => {
          btn.button.destroy();
          btn.text.destroy();
          btn.circle.destroy();
        });
        this.answerButtons = [];
        this.timerText?.destroy();
        this.timerEvent?.remove();
        this.pinImage?.destroy();
        this.pinMarker?.destroy();
        this.matchingPairs.forEach((pair) => {
          pair.left.destroy();
          pair.right.destroy();
          pair.line?.destroy();
        });
        this.matchingPairs = [];
      }

      setupQuizOrTrueFalse(task: GameTask) {
        const optionCount = Math.min(Math.max(task.options.length, 4), 8);
        task.options.slice(0, optionCount).forEach((option, index) => {
          const color = BUTTON_COLORS[index % BUTTON_COLORS.length];
          const button = this.add.rectangle(200 + (index % 2) * 400, 250 + Math.floor(index / 2) * 100, 350, 80, 0xffffff);
          button.setStrokeStyle(10, color, 1);
          button.setOrigin(0.5);
          button.setInteractive();

          const buttonText = this.add.text(200 + (index % 2) * 400, 250 + Math.floor(index / 2) * 100, option as string, {
            fontSize: "20px",
            color: "#000000",
          }).setOrigin(0.5);

          const circle = this.add.graphics({ x: button.x + 140, y: button.y });
          circle.lineStyle(2, 0xffffff, 1);
          circle.strokeCircle(0, 0, 15);
          circle.setInteractive(new Phaser.Geom.Circle(0, 0, 15), Phaser.Geom.Circle.Contains);

          if (option) {
            button.setFillStyle(color, 1);
            button.setStrokeStyle(0, 0, 0);
            circle.fillStyle(color, 1);
            circle.fillCircle(0, 0, 15);
            circle.lineStyle(2, 0xffffff, 1);
            circle.strokeCircle(0, 0, 15);
          }

          button.on("pointerdown", () => this.checkAnswer(index, circle));
          circle.on("pointerdown", () => this.checkAnswer(index, circle));
          button.on("pointerover", () => button.setScale(1.05));
          button.on("pointerout", () => button.setScale(1));

          this.answerButtons.push({ button, text: buttonText, circle });
        });
      }

      setupPinAnswer(task: GameTask) {
        if (task.image) {
          this.pinImage = this.add.image(400, 350, task.id).setOrigin(0.5);
          this.pinImage.setInteractive();
          this.pinMarker = this.add.graphics();
          this.pinMarker.fillStyle(0xff0000, 1);
          this.pinMarker.fillCircle(0, 0, 10);

          this.pinImage.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            const x = pointer.x - this.pinImage!.x;
            const y = pointer.y - this.pinImage!.y;
            this.pinMarker!.setPosition(pointer.x, pointer.y);
            this.checkPinAnswer({ x, y });
          });
        }
      }

      setupMatching(task: GameTask) {
        const pairs = task.options as MatchingPair[];
        pairs.forEach((pair, index) => {
          const leftText = this.add.text(200, 200 + index * 50, pair.left, { fontSize: "20px", color: "#ffffff" }).setOrigin(0.5);
          const rightText = this.add.text(600, 200 + index * 50, pair.right, { fontSize: "20px", color: "#ffffff" }).setOrigin(0.5);
          leftText.setInteractive();
          rightText.setInteractive();

          leftText.on("pointerdown", () => this.handleMatchingSelection(pair, leftText, rightText));
          rightText.on("pointerdown", () => this.handleMatchingSelection(pair, leftText, rightText));

          this.matchingPairs.push({ left: leftText, right: rightText, line: null });
        });
      }

      handleMatchingSelection(pair: MatchingPair, leftText: Phaser.GameObjects.Text, rightText: Phaser.GameObjects.Text) {
        const selectedPair = this.matchingPairs.find((p) => p.left === leftText || p.right === rightText);
        if (selectedPair && !selectedPair.line) {
          selectedPair.line = this.add.line(0, 0, leftText.x, leftText.y, rightText.x, rightText.y, 0xffffff).setOrigin(0);
          this.checkMatchingAnswer(pair);
        }
      }

      checkAnswer(index: number, circle: Phaser.GameObjects.Graphics) {
        const task = this.gameTasks[this.currentQuestionIndex];
        let isCorrect = false;

        if (task.question_type === "quiz") {
          isCorrect = (task.correct_answers as string[]).includes(task.options[index] as string);
        } else if (task.question_type === "true_false") {
          isCorrect = task.options[index] === task.correct_answers;
        }

        if (isCorrect) {
          this.score += task.points;
          this.correctSound.play();
          circle.clear();
          circle.fillStyle(0x4caf50, 1);
          circle.fillCircle(0, 0, 15);
          this.add.text(circle.x, circle.y, "✔", { fontSize: "20px", color: "#ffffff" }).setOrigin(0.5);
        } else {
          this.wrongSound.play();
        }

        this.scoreText.setText(`Очки: ${this.score}`);
        this.currentQuestionIndex++;
        this.setupQuestion();
      }

      checkPinAnswer(position: Position) {
        const task = this.gameTasks[this.currentQuestionIndex];
        const correctPos = task.correct_position!;
        const tolerance = 20;
        const isCorrect =
          Math.abs(position.x - correctPos.x) <= tolerance && Math.abs(position.y - correctPos.y) <= tolerance;

        if (isCorrect) {
          this.score += task.points;
          this.correctSound.play();
          this.pinMarker!.fillStyle(0x00ff00, 1);
          this.pinMarker!.clear();
          this.pinMarker!.fillCircle(0, 0, 10);
        } else {
          this.wrongSound.play();
        }

        this.scoreText.setText(`Очки: ${this.score}`);
        this.currentQuestionIndex++;
        this.setupQuestion();
      }

      checkMatchingAnswer(pair: MatchingPair) {
        const task = this.gameTasks[this.currentQuestionIndex];
        const correctPairs = task.correct_answers as MatchingPair[];
        const isCorrect = correctPairs.some((cp) => cp.left === pair.left && cp.right === pair.right && cp.correct);

        if (isCorrect) {
          this.score += task.points;
          this.correctSound.play();
        } else {
          this.wrongSound.play();
        }

        this.scoreText.setText(`Очки: ${this.score}`);
        this.currentQuestionIndex++;
        this.setupQuestion();
      }

      updateTimer() {
        this.timeLeft--;
        this.timerText.setText(`Время: ${this.timeLeft}`);
        if (this.timeLeft <= 0) {
          this.currentQuestionIndex++;
          this.setupQuestion();
        }
      }

      endGame() {
        const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
        this.add.text(400, 300, `Игра окончена! Очки: ${this.score}`, {
          fontSize: "32px",
          color: "#ffffff",
        }).setOrigin(0.5);
      
        submitResult({
          assignment_id: Number(assignmentId), // string -> number
          score: this.score,
          time_spent: String(timeSpent), // number -> string
        })
          .then(() => console.log("Результаты сохранены"))
          .catch((err) => console.error("Ошибка сохранения результатов:", err));
      }
    }

    gameInstance.current = new Phaser.Game({ ...config, scene: QuizScene });

    return () => {
      if (gameInstance.current) {
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
    };
  }, [gameTasks, assignmentId]);

  return <div ref={gameRef} />;
};

export default QuizGame;