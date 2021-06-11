<template>
  <div id="app">
    <canvas ref='canvas' class='absolute'></canvas>
    <div v-if='!webGLEnabled'>
      <div class='absolute no-webgl'>
        <h4>WebGL is not enabled :(</h4>
        <div>While <a href='https://github.com/anvaka/ngraph.path' class='highlighted'>ngraph.path</a> does not require any webgl, this demo needs it.</div>
        <iframe src="https://www.youtube.com/embed/hGeZuIEV6KU" frameborder="0" allowfullscreen class='video-demo'></iframe>
      </div>
    </div>
    <div v-if='webGLEnabled'>
      <svg ref='svg' class='svg-overlay absolute'>
        <g class='scene'>

          <path v-for='path in pathInfo.svgPaths' :d='path.path' :stroke-width='path.width' :stroke='path.color' stroke-opacity='0.1' fill-opacity='0' fill='transparent' ></path>

          <path ref='foundPath' :d='pathInfo.svgPath' stroke-width='1x' stroke='#6699cc' fill-opacity='0.05' fill='transparent' ></path>

          <route-point :point='routeStart' :scale='scale' :r='routeStart.r' v-if='routeStart.visible'></route-point>
          <route-point :point='routeEnd' :scale='scale' :r='routeEnd.r' v-if='routeEnd.visible'></route-point>
        </g>
      </svg>
    </div>
  </div>
</template>

<script>
import api from './appModel';
import SVGContainer from './SVGContainer';
import RoutePoint from './components/RoutePoint';
import About from './components/About';

const bus = require('./bus');
const wgl = require('w-gl');

export default {
  name: 'app',
  components: {
    RoutePoint,
    About
  },
  mounted() {
    this.webGLEnabled = wgl.isWebGLEnabled(this.$refs.canvas);
    if (!this.webGLEnabled) {
      // TODO: Maybe render something smaller with SVG?
      return;
    }

    api.loadPositions()
    bus.on('graph-loaded', this.createScene, this);
  },
  beforeDestroy() {
    bus.off('graph-loaded', this.createScene);
    this.ensurePreviousSceneDestroyed();
  },
  data() {
    return {
      webGLEnabled: true,
      loaded: false,
      detailsVisible: false,
      progress: api.progress,
      routeStart: api.routeStart,
      routeEnd: api.routeEnd,
      stats: api.stats,
      scale: 1,
      pathInfo: api.pathInfo,
      pathFinder: api.pathFinderSettings,
      graphSettings: api.graphSettings,
      aboutVisible: false,
    }
  },
  computed: {
    graphNameTitle() {
      let stats = this.stats;
      if (!stats) return '';

      return stats.graphNodeCount + ' nodes; ' + stats.graphLinksCount + ' edges';
    },
    helpVisible() {
      return !(this.routeStart.visible && this.routeEnd.visible);
    },
    pathText() {
      if (this.pathInfo.noPath) {
        return 'No path (' + this.stats.lastSearchTook + ')';
      }
      return 'Found in: ' + this.stats.lastSearchTook;
    }
  },

  methods: {
    clearRoute() {
      api.clearRoute();
    },
    getHelpText() {
      if (!this.routeStart.visible) {
        return 'Click anywhere to select starting point';
      } else if (!this.routeEnd.visible) {
        return 'Click anywhere to select destination';
      }
    },

    ensurePreviousSceneDestroyed() {
      if (this.scene) {
        this.scene.dispose();
        this.scene = null;
      }
      if (this.unsubscribeMoveEvents) {
        this.unsubscribeMoveEvents();
        this.unsubscribeMoveEvents = null;
      }
    },

    createScene() {
      this.ensurePreviousSceneDestroyed();

      let canvas = this.$refs.canvas;
      this.loaded = true;

      this.scene = wgl.scene(canvas);
      // this.scene.setPixelRatio(2);
      let scene = this.scene;
      let svgConntainer = new SVGContainer(this.$refs.svg.querySelector('.scene'), this.updateSVGElements.bind(this));
      this.scene.appendChild(svgConntainer)
      scene.setClearColor(1, 1, 1, 1)

      let bbox = api.getGraphBBox();
      let initialSceneSize = bbox.width/8;
      scene.setViewBox({
        left:  -initialSceneSize,
        top:   -initialSceneSize,
        right:  initialSceneSize,
        bottom: initialSceneSize,
      })

      let graph = api.getGraph();

      let linksCount = graph.getLinksCount();
      let lines = new wgl.WireCollection(linksCount);
      lines.color = {r: 0, g: 0, b: 0, a: 0.1}
      graph.forEachLink(function (link) {
        let from = graph.getNode(link.fromId).data;
        let to = graph.getNode(link.toId).data

        lines.add({ from, to });
      });

      scene.appendChild(lines);
      let countTriggers = 0;
      let runningIntervalFunc = setInterval(() => {
         this.onSceneClick(countTriggers % 100 == 0);
         countTriggers += 1;
         if (countTriggers > 500) {
           clearInterval(runningIntervalFunc);
           console.log("drawing pt 1 done");
           let runningIntervalPart2 = setInterval(() => {
             this.onSceneClick(true);
             countTriggers += 1;
             if (countTriggers > 1000) {
               clearInterval(runningIntervalPart2);
               console.log("done drawing");
             }
           }, 150);
         }
      }, 60)
    },

    updateSVGElements(svgConntainer) {
      let strokeWidth = 6/svgConntainer.scale;
      if (Array.isArray(this.$refs.foundPath)) {
        this.$refs.foundPath.map(ea => ea.setAttributeNS(null, 'stroke-width', strokeWidth + 'px'));
      } else {
        this.$refs.foundPath.setAttributeNS(null, 'stroke-width', strokeWidth + 'px');
      }
      this.scale = svgConntainer.scale / this.scene.getPixelRatio() * 5;
    },

    updateGraph() {
      this.ensurePreviousSceneDestroyed();
      setTimeout(() => {
        api.updateSelectedGraph();
      }, 2);
    },

    updateSearchAlgorithm() {
      api.updateSearchAlgorithm();
    },

    onSceneClick(triggerRedraw) {
      api.handleSceneClick(triggerRedraw);
    },
  }
}
</script>

<style lang='stylus'>
.absolute {
  position: absolute;
}

canvas {
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}


.center {
  display: flex;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.direction-switch {
  display: flex;
  height: 100%;
  flex: 1;
  align-items: center;
  justify-content: center;
}

a {
  text-decoration: none;
}

a.direction-switch {
  color: hsla(215, 37%, 55%, 1);
}
a.highlighted {
  color: white;
  border-bottom: 1px dashed white;
}

.bold {
  color: hsla(215, 37%, 85%, 1);
}

.row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: baseline;
  height: 32px;
}
.col {
  flex: 1
}

.details {
  padding: 8px 14px;
}

select {
  background: transparent;
  border: none;
  color: hsla(215, 37%, 85%, 1);
  appearance: none;
  font-size: 14px;
  border-bottom: 1px dashed;
  border-radius: 0;
  padding-bottom: 4px;
}

option {
  color: black;
}

svg text {
  pointer-events: none;
  user-select: none;
}
select:focus {
  outline: none;
}

.graph-name {
  position: absolute;
  bottom: 42px;
  left: 50%;
  transform: translateX(-50%);
  background-color: hsla(215, 74%, 18%, 0.8);
  padding: 0 10px;
  select {
    font-size: 24px;
    cursor: pointer;
  }
}

@media (max-width: 800px) {
  .progress {
    font-size: 18px;
  }

  .details {
    padding: 5px;
  }
  .controls {
    width: 100%;
    margin: 0;
  }
  .stats {
    margin: 0;
    bottom: 0px;
    top: auto;
  }

  a.about-link {
    bottom: 0;
    padding-bottom: 4px;
  }

  .no-webgl {
    .video-demo {
      width: 560px;
      height: 315px;
    }
  }

  .direction-switch {
    font-size: 14px;
  }
}

@media (max-width: 600px) {
  .no-webgl {
    padding: 0;
    div {
      padding: 7px;
    }
    .video-demo {
      width: 100%;
      height: 300px;
    }
  }
  .graph-name {
    bottom: 48px;
    select {
      font-size: 16px;
    }
  }
}

svg.svg-overlay {
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background: transparent;
}

.route-info-container {
  display: flex;
}

svg.route-info {
  flex: 1;
  height: 10px;
  cursor: pointer;
  width: 100%;
  margin-left: 7px;
}

a.reset {
  color: hsla(215, 37%, 85%, 1);
  font-size: small;
  padding: 0 10px;
  display: block;
  height: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}


.label {
  width: 100px;
  flex-shrink: 0;
  padding-right: 7px;
}
.no-pointer {
  pointer-events: none;
}

.error {
  color:deeppink;
}
.error-details {
  font-family: monospace;
  text-align: left;
}

a::selection,
h3::selection,
h4::selection,
div::selection,
p::selection {
  background: #d03094;
  color: white;
}
</style>
