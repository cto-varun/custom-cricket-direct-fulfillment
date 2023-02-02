/* eslint-disable complexity */
import React, { useState, useEffect } from 'react';
import { Modal, notification } from 'antd';
import { MessageBus } from '@ivoyant/component-message-bus';
import { useLocation } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import moment from 'moment';
import './style.css';
import { Typography } from 'antd';

const { Title } = Typography;

export default function DirectFulfillment({ datasources, properties }) {
    const [visible, setVisible] = useState(false);
    const location = useLocation();
    const [currentSessionId, setCurrentSessionId] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [dfUserData, setDfUserData] = useState({});
    const { iframeProps, dfWorkflow } = properties;

    const {
        workflow,
        datasource,
        successStates,
        errorStates,
        responseMapping,
    } = dfWorkflow;

    const { src, ...rest } = iframeProps;

    useEffect(() => {
        if (location?.state?.routeData?.df) {
            document.title = 'Direct Fulfillment';
            setDfUserData(location?.state?.routeData?.df);
            sessionStorage.removeItem('directFulfillment');
            handleCreateSession(location?.state?.routeData?.df);
        }
    }, [location?.key]);

    const handleCreateSessionResponse =
        (sessionId) => (subscriptionId, topic, eventData, closure) => {
            const state = eventData.value;
            const isSuccess = successStates.includes(state);
            const isFailure = errorStates.includes(state);
            if (isSuccess || isFailure) {
                if (isSuccess) {
                    setCurrentSessionId(sessionId);
                    setVisible(true);
                }
                if (isFailure) {
                    notification['error']({
                        message: 'Direct Fulfillment',
                        description:
                            eventData?.event?.data?.message ||
                            'Error generating the token. Please try again later!',
                    });
                }
                MessageBus.unsubscribe(subscriptionId);
            }
        };

    const handleCreateSession = (data) => {
        if (!currentSessionId) {
            const sessionId = uuid();
            let { attId } =
                window[window.sessionStorage?.tabId].COM_IVOYANT_VARS;
            const requestBody = JSON.stringify({
                sessionMetadata: {
                    linkedIds: [
                        {
                            idName: 'billingAccountNumber',
                            idValue: data?.ban,
                        },
                        {
                            idName: 'repId',
                            idValue: attId,
                        },
                        {
                            idName: 'interactionId',
                            idValue: data?.interactionId,
                        },
                    ],
                    lockedIndicator: false,
                    sessionChannel: 'DFCARE',
                    sessionDuration: {
                        expirationTime: moment()
                            .add(24, 'h')
                            .toDate()
                            .toISOString(),
                        timeToExpire: 86400,
                        timeToExpireUnit: 'SECONDS',
                    },
                    sessionId: sessionId,
                },
                sessionStateData: {
                    associatedObjects: [
                        {
                            objectType: 'VoyageDFSessionToken',
                            objectValue: {
                                account: {
                                    billingAccountNumber: data?.ban,
                                    repId: attId,
                                    interactionId: data?.interactionId,
                                    subscribers: data?.subscribers,
                                },
                            },
                        },
                    ],
                    sessionState: 'CREATED',
                },
            });
            const submitEvent = 'SUBMIT';
            MessageBus.send('WF.'.concat(workflow).concat('.INIT'), {
                header: {
                    registrationId: workflow,
                    workflow: workflow,
                    eventType: 'INIT',
                },
            });
            MessageBus.subscribe(
                workflow,
                'WF.'.concat(workflow).concat('.STATE.CHANGE'),
                handleCreateSessionResponse(sessionId)
            );
            MessageBus.send(
                'WF.'.concat(workflow).concat('.').concat(submitEvent),
                {
                    header: {
                        registrationId: workflow,
                        workflow: workflow,
                        eventType: submitEvent,
                    },
                    body: {
                        datasource: datasources[datasource],
                        request: {
                            params: {
                                sessionId: sessionId,
                            },
                            body: requestBody,
                        },
                        responseMapping,
                    },
                }
            );
        }
    };

    const handleCancel = () => {
        setAlertVisible(false);
        setVisible(false);
        setCurrentSessionId(null);
    };

    return (
        <div style={{ margin: 12 }}>
            <Title level={4}>Direct Fulfillment - BAN: {dfUserData?.ban}</Title>
            {visible && (
                <iframe src={`${src}${currentSessionId}/DFCARE`} {...rest} />
            )}
            {/* <Modal
                title="Direct Fulfillment Flow"
                okText="Yes"
                cancelText="No"
                visible={alertVisible}
                onOk={() => handleCancel()}
                onCancel={() => setAlertVisible(false)}
            >
                <p>
                    Closing the flow will cause you to lose progress. Would you
                    like to proceed?
                </p>
            </Modal>
            <Modal
                className="direct-fulfillment-modal"
                title={`Direct Fulfillment - BAN: ${dfUserData?.ban}`}
                visible={visible}
                onCancel={() => setAlertVisible(true)}
                footer={null}
                maskClosable={false}
                width="100%"
            ></Modal> */}
        </div>
    );
}
