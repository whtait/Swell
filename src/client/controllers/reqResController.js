import * as store from "../store";
import * as actions from "../actions/actions";
import wsController from "./wsController.js";
import graphQLController from "./graphQLController.js";

const { api } = window;
let events;
const connectionController = {
  openConnectionArray: [],

  getReqRes_CurrentTabAndSelected() {
    const { reqResArray } = store.default.getState().business;

    const { currentTab } = store.default.getState().business;

    return reqResArray.filter(
      (reqRes) => reqRes.tab === currentTab && reqRes.checked
    );
  },

  toggleSelectAll() {
    const { reqResArray } = store.default.getState().business;
    console.log(reqResArray);

    if (reqResArray.every((obj) => obj.checked === true)) {
      reqResArray.forEach((obj) => (obj.checked = false));
    } else {
      reqResArray.forEach((obj) => (obj.checked = true));
    }
    store.default.dispatch(actions.setChecksAndMinis(reqResArray));
  },

  openReqRes(id) {
    // listens for reqResUpdate event from main process telling it to update reqResobj
    api.receive("reqResUpdate", (reqResObj) =>
      store.default.dispatch(actions.reqResUpdate(reqResObj))
    );
    //Since only obj ID is passed in, next two lines get the current array of reqest objects and finds the one with matching ID
    const reqResArr = store.default.getState().business.reqResArray;
    const reqResObj = reqResArr.find((el) => el.id === id);
    if (reqResObj.request.method === "SUBSCRIPTION")
      graphQLController.openSubscription(reqResObj);
    else if (reqResObj.graphQL) {
      graphQLController.openGraphQLConnection(reqResObj);
    } else if (/wss?:\/\//.test(reqResObj.protocol))
      wsController.openWSconnection(reqResObj, this.openConnectionArray);
    //gRPC  connection
    else if (reqResObj.gRPC) {
      api.send("open-grpc", reqResObj);
      //Standard HTTP?
    } else {
      api.send("open-http", reqResObj, this.openConnectionArray);
    }
  },

  openAllSelectedReqRes() {
    connectionController.closeAllReqRes();

    const selectedAndCurrentTabReqResArr = connectionController.getReqRes_CurrentTabAndSelected();

    selectedAndCurrentTabReqResArr.forEach((reqRes) =>
      connectionController.openReqRes(reqRes.id)
    );
  },

  getConnectionObject(id) {
    return this.openConnectionArray.find((obj) => (obj.id = id));
  },

  setReqResConnectionToClosed(id) {
    const reqResArr = store.default.getState().business.reqResArray;

    const foundReqRes = reqResArr.find((reqRes) => reqRes.id === id);
    foundReqRes.connection = "closed";
    store.default.dispatch(actions.reqResUpdate(foundReqRes));
  },

  closeReqRes(id) {
    this.setReqResConnectionToClosed(id);

    const foundAbortController = this.openConnectionArray.find(
      (obj) => obj.id === id
    );
    if (foundAbortController) {
      switch (foundAbortController.protocol) {
        case "HTTP1": {
          foundAbortController.abort.abort();
          break;
        }
        case "HTTP2": {
          foundAbortController.stream.close();
          break;
        }
        case "WS": {
          foundAbortController.socket.close();
          break;
        }
        default:
          console.log("Invalid Protocol");
      }
      console.log("Connection aborted.");
    }

    this.openConnectionArray = this.openConnectionArray.filter(
      (obj) => obj.id !== id
    );
  },

  /* Closes all open endpoint */
  closeAllReqRes() {
    const selectedAndCurrentTabReqResArr = connectionController.getReqRes_CurrentTabAndSelected();
    selectedAndCurrentTabReqResArr.forEach((reqRes) =>
      connectionController.closeReqRes(reqRes.id)
    );
  },

  clearAllReqRes() {
    connectionController.closeAllReqRes();
    store.default.dispatch(actions.reqResClear());
  },

  toggleMinimizeAll() {
    const { reqResArray } = store.default.getState().business;
    console.log(reqResArray);

    if (reqResArray.every((obj) => obj.minimized === true)) {
      reqResArray.forEach((obj) => (obj.minimized = false));
    } else {
      reqResArray.forEach((obj) => (obj.minimized = true));
    }
    store.default.dispatch(actions.setChecksAndMinis(reqResArray));
  },

  clearGraph() {
    store.default.dispatch(actions.clearGraph());
  },
};

export default connectionController;
