"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = DirectFulfillment;
var _react = _interopRequireWildcard(require("react"));
var _antd = require("antd");
var _componentMessageBus = require("@ivoyant/component-message-bus");
var _reactRouterDom = require("react-router-dom");
var _uuid = require("uuid");
var _moment = _interopRequireDefault(require("moment"));
require("./style.css");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
const {
  Title
} = _antd.Typography;
function DirectFulfillment(_ref) {
  let {
    datasources,
    properties
  } = _ref;
  const [visible, setVisible] = (0, _react.useState)(false);
  const location = (0, _reactRouterDom.useLocation)();
  const [currentSessionId, setCurrentSessionId] = (0, _react.useState)(false);
  const [alertVisible, setAlertVisible] = (0, _react.useState)(false);
  const [dfUserData, setDfUserData] = (0, _react.useState)({});
  const {
    iframeProps,
    dfWorkflow
  } = properties;
  const {
    workflow,
    datasource,
    successStates,
    errorStates,
    responseMapping
  } = dfWorkflow;
  const {
    src,
    ...rest
  } = iframeProps;
  (0, _react.useEffect)(() => {
    if (location?.state?.routeData?.df) {
      document.title = 'Direct Fulfillment';
      setDfUserData(location?.state?.routeData?.df);
      sessionStorage.removeItem('directFulfillment');
      handleCreateSession(location?.state?.routeData?.df);
    }
  }, [location?.key]);
  const handleCreateSessionResponse = sessionId => (subscriptionId, topic, eventData, closure) => {
    const state = eventData.value;
    const isSuccess = successStates.includes(state);
    const isFailure = errorStates.includes(state);
    if (isSuccess || isFailure) {
      if (isSuccess) {
        setCurrentSessionId(sessionId);
        setVisible(true);
      }
      if (isFailure) {
        _antd.notification['error']({
          message: 'Direct Fulfillment',
          description: eventData?.event?.data?.message || 'Error generating the token. Please try again later!'
        });
      }
      _componentMessageBus.MessageBus.unsubscribe(subscriptionId);
    }
  };
  const handleCreateSession = data => {
    if (!currentSessionId) {
      const sessionId = (0, _uuid.v4)();
      let {
        attId
      } = window[window.sessionStorage?.tabId].COM_IVOYANT_VARS;
      const requestBody = JSON.stringify({
        sessionMetadata: {
          linkedIds: [{
            idName: 'billingAccountNumber',
            idValue: data?.ban
          }, {
            idName: 'repId',
            idValue: attId
          }, {
            idName: 'interactionId',
            idValue: data?.interactionId
          }],
          lockedIndicator: false,
          sessionChannel: 'DFCARE',
          sessionDuration: {
            expirationTime: (0, _moment.default)().add(24, 'h').toDate().toISOString(),
            timeToExpire: 86400,
            timeToExpireUnit: 'SECONDS'
          },
          sessionId: sessionId
        },
        sessionStateData: {
          associatedObjects: [{
            objectType: 'VoyageDFSessionToken',
            objectValue: {
              account: {
                billingAccountNumber: data?.ban,
                repId: attId,
                interactionId: data?.interactionId,
                subscribers: data?.subscribers
              }
            }
          }],
          sessionState: 'CREATED'
        }
      });
      const submitEvent = 'SUBMIT';
      _componentMessageBus.MessageBus.send('WF.'.concat(workflow).concat('.INIT'), {
        header: {
          registrationId: workflow,
          workflow: workflow,
          eventType: 'INIT'
        }
      });
      _componentMessageBus.MessageBus.subscribe(workflow, 'WF.'.concat(workflow).concat('.STATE.CHANGE'), handleCreateSessionResponse(sessionId));
      _componentMessageBus.MessageBus.send('WF.'.concat(workflow).concat('.').concat(submitEvent), {
        header: {
          registrationId: workflow,
          workflow: workflow,
          eventType: submitEvent
        },
        body: {
          datasource: datasources[datasource],
          request: {
            params: {
              sessionId: sessionId
            },
            body: requestBody
          },
          responseMapping
        }
      });
    }
  };
  const handleCancel = () => {
    setAlertVisible(false);
    setVisible(false);
    setCurrentSessionId(null);
  };
  return /*#__PURE__*/_react.default.createElement("div", {
    style: {
      margin: 12
    }
  }, /*#__PURE__*/_react.default.createElement(Title, {
    level: 4
  }, "Direct Fulfillment - BAN: ", dfUserData?.ban), visible && /*#__PURE__*/_react.default.createElement("iframe", _extends({
    src: `${src}${currentSessionId}/DFCARE`
  }, rest)));
}
module.exports = exports.default;