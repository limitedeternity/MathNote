const app = require("electron").remote.app;
const glob = require("glob");
const fs = require("fs");
const path = require("path");
const watch = require("node-watch");
const markdown = require("markdown").markdown;
const firstline = require("firstline");

var dataStored = false;
var store = new Vuex.Store({
  state: {
    noteList: [],
    shortcutsList: []
  },
  getters: {
    noteList: state => state.noteList,
    shortcutsList: state => state.shortcutsList
  },
  mutations: {
    async readAssets(state) {
      if (!dataStored) {
        let { noteNames } = await new Promise(resolve => {
          glob(
            path.join(app.getAppPath(), "notes", "*.md"),
            (err, notePaths) => {
              if (err) throw err;

              let noteNames = notePaths.map(notePath =>
                path.basename(notePath, path.extname(notePath))
              );
              resolve({ noteNames });
            }
          );
        });

        let { shortcutNames } = await new Promise(resolve => {
          glob(
            path.join(app.getAppPath(), "shortcuts", "*.js"),
            (err, shortcutPaths) => {
              if (err) throw err;

              let shortcutNames = shortcutPaths.map(shortcutPath =>
                path.basename(shortcutPath, path.extname(shortcutPath))
              );
              resolve({ shortcutNames });
            }
          );
        });

        let shortcutsList = [];
        shortcutNames.forEach(shortcutName => {
          shortcutsList.push({
            name: shortcutName
          });
        });

        state.shortcutsList = shortcutsList;

        let noteList = [];
        noteNames.forEach(async noteName => {
          let noteDescription = await firstline(
            path.join(app.getAppPath(), "notes", `${noteName}.md`),
            {
              encoding: "utf8"
            }
          );

          noteList.push({
            name: noteName,
            description: noteDescription
          });
        });

        state.noteList = noteList;
      }
    }
  },
  actions: {
    readAssets({ commit }) {
      return new Promise(async resolve => {
        await commit("readAssets");
        dataStored = true;

        resolve({ finished: true });
      });
    }
  }
});

var pageComponents = {
  notesComponent: {
    template: `
        <div>
          <template v-if="noteList.length > 0">
            <template v-for="(noteObject, index) in noteList">
              <div class="card" :key="'note-' + index">
                <header class="card-header">
                  <p class="card-header-title">
                    {{ noteObject.name }}
                  </p>
                </header>

                <div class="card-content">
                  <div class="content" style="font-weight: 500;">
                      {{ noteObject.description }}
                      <br>
                  </div>
                </div>

                <div class="modal">
                  <div class="modal-background"></div>
                  <div class="modal-card">
                    <header class="modal-card-head">
                      <p class="modal-card-title">{{ noteObject.name }}</p>
                    </header>
                    <section class="modal-card-body">
                      <div class="content"></div>
                    </section>
                    <footer class="modal-card-foot">
                      <button class="button" @click="printNote($event)">Print</button>
                      <button class="button is-primary" @click="closeNote($event)">Close</button>
                    </footer>
                  </div>
                </div>

                <footer class="card-footer">
                  <a href="#" class="card-footer-item is-medium" @click="openNote(noteObject.name, $event)">View</a>
                </footer>
              </div>
              <div v-if="index !== noteList.length - 1" :key="'delimiter-' + index" style="display: block; clear: both; height: 15px;"></div>
            </template>
          </template>
          <template v-else>
            <div class="card">
              <header class="card-header">
                <p class="card-header-title">
                  No notes detected
                </p>
              </header>

              <div class="card-content">
                <div class="content">
                    To get started, create any.
                    <br>
                </div>
              </div>
            </div>
          </template>
        </div>
        `,
    name: "Notes",
    computed: {
      ...Vuex.mapGetters(["noteList", "shortcutsList"])
    },
    methods: {
      mountWatcher() {
        watch(["notes", "shortcuts"], { recursive: true }, async () => {
          dataStored = false;
          await this.$store.dispatch("readAssets");
        });
      },
      openNote(noteName, event) {
        let noteContents = fs
          .readFileSync(
            path.join(app.getAppPath(), "notes", `${noteName}.md`),
            "utf8"
          )
          .toString("utf8");

        let noteContentsWithMath = noteContents.replace(
          /#{([^}]*)}/g,
          (occurency, shortcutNameMatch) => {
            let shortcutName = shortcutNameMatch.trim();
            let shortcutExists = Boolean(
              this.shortcutsList.find(
                shortcutObj => shortcutObj.name === shortcutName
              )
            );

            if (shortcutExists) {
              return require(path.join(
                app.getAppPath(),
                "shortcuts",
                `${shortcutName}.js`
              ));
            } else {
              return "undefined";
            }
          }
        );

        event.currentTarget.parentNode.parentNode
          .querySelector(".modal")
          .querySelector(
            ".modal-card-body"
          ).firstChild.innerHTML = markdown.toHTML(noteContentsWithMath);
        renderMathInElement(
          event.currentTarget.parentNode.parentNode
            .querySelector(".modal")
            .querySelector(".modal-card-body").firstChild
        );

        event.currentTarget.parentNode.parentNode
          .querySelector(".modal")
          .classList.add("is-active");
      },
      closeNote(event) {
        event.currentTarget.parentNode.parentNode.parentNode.classList.remove(
          "is-active"
        );
        event.currentTarget.parentNode.parentNode.querySelector(
          ".modal-card-body"
        ).firstChild.innerHTML = "";
      },
      printNote(event) {
        let noteRoot = event.currentTarget.parentNode.parentNode;
        noteRoot.querySelector("section").style = "display: block; position: fixed; top: 0; left: 0; bottom: 0; right: 0; overflow: auto; page-break-before: always;";
        noteRoot.querySelector("footer").style = "display: none";

        new Promise(resolve => 
          setTimeout(
            () => {
              resolve(window.print());
            }, 
            500
          )).then(() => {
            noteRoot.querySelector("section").removeAttribute("style");
            noteRoot.querySelector("footer").removeAttribute("style");
        });
      }
    },
    async created() {
      await this.$store.dispatch("readAssets");
      this.mountWatcher();
    }
  },
  shortcutsComponent: {
    template: `
        <div class="card">
          <template v-if="shortcutsList.length > 0">
            <header class="card-header">
              <p class="card-header-title">
                Defined shortcuts
              </p>
            </header>

            <div class="card-content">
              <div class="content">
                <ul>
                  <li v-for="(shortcutObj, index) in shortcutsList" :key="index" style="font-weight: 500;">{{ shortcutObj.name }}</li>
                </ul>
                <br>
              </div>
            </div>
          </template>
          <template v-else>
            <header class="card-header">
              <p class="card-header-title">
                No shortcuts detected
              </p>
            </header>

            <div class="card-content">
              <div class="content">
                To start using them, create any.
                <br>
              </div>
            </div>
          </template>
        </div>
        `,
    name: "Shortcuts",
    computed: {
      ...Vuex.mapGetters(["shortcutsList"])
    },
    methods: {
      mountWatcher() {
        watch(["notes", "shortcuts"], { recursive: true }, async () => {
          dataStored = false;
          await this.$store.dispatch("readAssets");
        });
      }
    },
    async created() {
      await this.$store.dispatch("readAssets");
      this.mountWatcher();
    }
  },
  infoComponent: {
    template: `
        <div class="card">
          <header class="card-header">
            <p class="card-header-title">
              Info
            </p>
          </header>

          <div class="card-content">
            <div class="content">
              <h2>Links</h2>
              <p>Author's website: <a href="https://limitedeternity.github.io/" target="_blank">https://limitedeternity.github.io/</a></p>
              <p>Project repository: <a href="https://github.com/limitedeternity/MathNote/" target="_blank">https://github.com/limitedeternity/MathNote/</a></p>
              <br>

              <h2>How to write notes?</h2>
              <p>It's very simple. Just use your favourite text editor. <br>
              To start writing note you should create <code>{note_name}.md</code> file in <code>notes</code> folder. <br>
              Then open this file in your editor and use <a href="https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet" target="_blank">Markdown language</a> to create your awesome conspect. <br>
              <strong>MathNote</strong> is bundled with some note examples by default. Go check them out!
              </p>
              <br>

              <h2>How to create shortcuts?</h2>
              <p>Your text editor will help you with that!<br><br>
              1. Create <code>{shortcut_name}.js</code> file in <code>shortcuts</code> folder. <br>
              2. Open it. <br>
              3. Check out bundled examples to understand basic template of shortcuts. <br>
              4. Write your own.
              </p>
              <br>
            </div>
          </div>
        </div>
        `,
    name: "Info",
    methods: {
      mountWatcher() {
        watch(["notes", "shortcuts"], { recursive: true }, async () => {
          dataStored = false;
          await this.$store.dispatch("readAssets");
        });
      }
    },
    async created() {
      await this.$store.dispatch("readAssets");
      this.mountWatcher();
    }
  }
};

var router = new VueRouter({
  mode: "hash",
  routes: [
    {
      path: "/",
      name: "notes",
      component: pageComponents.notesComponent
    },
    {
      path: "/shortcuts",
      name: "shortcuts",
      component: pageComponents.shortcutsComponent
    },
    {
      path: "/info",
      name: "info",
      component: pageComponents.infoComponent
    }
  ]
});

router.beforeEach((to, from, next) => {
  whenDomReady().then(() => {
    from.name
      ? document
          .querySelector(`#${from.name}Link`)
          .parentNode.classList.remove("is-active")
      : document
          .querySelector("#notesLink")
          .parentNode.classList.remove("is-active");
    document
      .querySelector(`#${to.name}Link`)
      .parentNode.classList.add("is-active");
    next();
  });
});

new Vue({
  el: "#app",
  router: router,
  store: store
});
