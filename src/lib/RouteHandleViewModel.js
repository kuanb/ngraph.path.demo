class RouteHandleViewModel {
  constructor(pointChangedCallback, findNearestPoint) {
    this.visible = false;
    this.beingDragged = false;

    this.pointId = -1;
    this.x = 0;
    this.y = 0;
    this.r = 18;

    this.pointChanged = pointChangedCallback;
    this.findNearestPoint = findNearestPoint;
  }

  setFrom(graphNode) {
    this.visible = true;
    this.pointId = graphNode.id;
    this.x = graphNode.data.x;
    this.y = graphNode.data.y;
    this.pointChanged(this);
  }

  triggerReDraw() {
    // this.pointChanged(this);
  }

  clear() {
    this.visible = false;
    this.pointId = -1;
    this.x = 0;
    this.y = 0;
    this.pointChanged(this);
  }
}

module.exports = RouteHandleViewModel;