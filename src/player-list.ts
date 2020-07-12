import { Model, ModelNode } from "./model";

export function initPlayerList(model: Model) {
    model.on("added", (node) => {
        if (node === model.me) {
            addMeToMenu(node);
        } else {
            addOtherToMenu(node);
            node.on("updated", updateMenu);
        }
    });
    model.on("deleted", removeFromMenu);
}

function addMeToMenu(node: ModelNode) {
    const htmlPlayersContainer = document.getElementById("me");
    const playerContainer = document.createElement("div");
    playerContainer.id = "pi-" + node.Id();
    playerContainer.classList.add("main-player-item");
    playerContainer.classList.add("player");
    const playerColor = document.createElement("span");
    playerColor.classList.add("color-indicator");
    const playerName = document.createElement("input");
    playerName.type = "text";
    playerName.value = node.getNickname();
    playerName.addEventListener("change", () => {
        const nickname = playerName.value;
        node.setNickname(nickname);
        localStorage.setItem("nickname", nickname);
    });
    playerName.classList.add("me-list-name");

    playerContainer.insertBefore(playerName, null);
    playerContainer.insertBefore(playerColor, playerName);
    htmlPlayersContainer.insertBefore(playerContainer, null);

    const colorEl = document.querySelector(
        `#pi-${node.Id()} .color-indicator`
    ) as HTMLSpanElement;
    colorEl.style.backgroundColor = node.getColor();
}
function addOtherToMenu(node: ModelNode) {
    const htmlPlayersContainer = document.getElementById("players");
    const playerContainer = document.createElement("div");
    playerContainer.id = "pi-" + node.Id();
    playerContainer.classList.add("player")
    const playerColor = document.createElement("span");
    playerColor.classList.add("color-indicator");
    const playerName = document.createElement("span");
    playerName.classList.add("player-list-name");

    playerContainer.insertBefore(playerName, null);
    playerContainer.insertBefore(playerColor, playerName);
    htmlPlayersContainer.insertBefore(playerContainer, null);

    updatePlayerIndicator(node.Id(), node.getNickname(), node.getColor());
}

function removeFromMenu(node: ModelNode) {
    const id = node.Id();
    const playerEl = document.getElementById("pi-" + id);
    playerEl.parentNode.removeChild(playerEl);
}

function updateMenu(node: ModelNode) {
    updatePlayerIndicator(node.Id(), node.getNickname(), node.getColor());
}

function updatePlayerIndicator(id: string, name: string, color: string) {
    document.getElementById("pi-" + id);
    const playerNameEl = document.querySelector(
        `#pi-${id} .player-list-name`
    ) as HTMLSpanElement;
    const colorEl = document.querySelector(
        `#pi-${id} .color-indicator`
    ) as HTMLSpanElement;
    playerNameEl.innerText = name;
    colorEl.style.backgroundColor = color;
}
