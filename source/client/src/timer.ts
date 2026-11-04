/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. https://mozilla.org/MPL/2.0/
 * TypeScript port of BrowserQuest client/js/timer.js, Little Workshop. */
class Timer {
  constructor(public duration: number, public lastTime = 0) {}
  isOver(time: number): boolean {
    if (time - this.lastTime > this.duration) { this.lastTime = time; return true; }
    return false;
  }
}
export = Timer;
