import { GameManager } from "./game/GameManager";

const { regClass, property } = Laya;

@regClass()
export class Main extends Laya.Script {

    onStart() {
        GameManager.instance.init();
    }
}