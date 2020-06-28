import "./style.scss";
import { generateName } from "../lib/name-generator";

document.addEventListener(
    "DOMContentLoaded",
    () => {
        const roomNameInput = document.getElementById(
            "room-name"
        ) as HTMLInputElement;
        roomNameInput.value = generateName();
    },
    false
);
