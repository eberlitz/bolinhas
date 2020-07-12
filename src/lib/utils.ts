
export function randomColor(brightness: number) {
    function randomChannel(brightness: number) {
        var r = 255 - brightness;
        var n = 0 | (Math.random() * r + brightness);
        var s = n.toString(16);
        return s.length == 1 ? "0" + s : s;
    }
    return (
        "#" +
        randomChannel(brightness) +
        randomChannel(brightness) +
        randomChannel(brightness)
    );
}

export function getRoomName() {
    const url = window.location.href;
    const room = url.substring(url.lastIndexOf("/") + 1).toLowerCase();
    return room;
}
