import { useState, useEffect, useRef } from 'react';
import { WorkItem, User, ItemUpdateEvent, ConnectionStatus, Status } from '../types';
import { ALL_USERS, WORKFLOW_RULES } from '../constants';
import { faker } from 'https://cdn.skypack.dev/@faker-js/faker';

export const useRealtime = (
    isEnabled: boolean,
    workItems: WorkItem[],
    currentUser: User | null,
    onMessage: (message: ItemUpdateEvent) => void
) => {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
    const intervalRef = useRef<number | null>(null);
    const workItemsRef = useRef(workItems);

    useEffect(() => {
        workItemsRef.current = workItems;
    }, [workItems]);

    useEffect(() => {
        if (isEnabled && currentUser) {
            setConnectionStatus('CONNECTING');
            
            const connectTimeout = setTimeout(() => {
                setConnectionStatus('CONNECTED');
                
                intervalRef.current = window.setInterval(() => {
                    if (workItemsRef.current.length === 0 || !currentUser) return;

                    const otherUsers = ALL_USERS.filter(u => u.id !== currentUser.id);
                    if (otherUsers.length === 0) return;

                    const randomActor = faker.helpers.arrayElement(otherUsers);
                    const randomItem = faker.helpers.arrayElement(workItemsRef.current);
                    
                    const eventType = faker.helpers.arrayElement(['item.status_changed', 'item.assignee_changed', 'item.due_changed', 'item.comment_added']);

                    let event: ItemUpdateEvent | null = null;

                    switch (eventType) {
                        case 'item.status_changed':
                            const allowedTransitions = WORKFLOW_RULES[randomItem.status];
                            if (allowedTransitions && allowedTransitions.length > 0) {
                                const newStatus = faker.helpers.arrayElement(allowedTransitions);
                                event = {
                                    type: 'item.status_changed',
                                    item: { id: randomItem.id, boardId: randomItem.boardId, title: randomItem.title, assigneeId: randomItem.assignee.id, createdBy: randomItem.reporter.id },
                                    change: { field: 'status', from: randomItem.status, to: newStatus },
                                    watchers: randomItem.watchers,
                                    at: new Date().toISOString(),
                                    actor: randomActor,
                                };
                            }
                            break;
                        case 'item.assignee_changed':
                             const newAssignee = faker.helpers.arrayElement(otherUsers.filter(u => u.id !== randomItem.assignee.id));
                             if (newAssignee) {
                                 event = {
                                    type: 'item.assignee_changed',
                                    item: { id: randomItem.id, boardId: randomItem.boardId, title: randomItem.title, assigneeId: randomItem.assignee.id, createdBy: randomItem.reporter.id },
                                    change: { field: 'assignee', from: randomItem.assignee.name, to: newAssignee.name },
                                    watchers: randomItem.watchers,
                                    at: new Date().toISOString(),
                                    actor: randomActor,
                                 };
                             }
                             break;
                        case 'item.due_changed':
                            const newDueDate = faker.date.future({years: 0.1});
                             event = {
                                type: 'item.due_changed',
                                item: { id: randomItem.id, boardId: randomItem.boardId, title: randomItem.title, assigneeId: randomItem.assignee.id, createdBy: randomItem.reporter.id },
                                change: { field: 'dueDate', from: randomItem.dueDate, to: newDueDate.toISOString() },
                                watchers: randomItem.watchers,
                                at: new Date().toISOString(),
                                actor: randomActor,
                             };
                             break;
                        case 'item.comment_added':
                             event = {
                                type: 'item.comment_added',
                                item: { id: randomItem.id, boardId: randomItem.boardId, title: randomItem.title, assigneeId: randomItem.assignee.id, createdBy: randomItem.reporter.id },
                                change: { field: 'comment', from: null, to: faker.lorem.sentence() },
                                watchers: randomItem.watchers,
                                at: new Date().toISOString(),
                                actor: randomActor,
                             };
                             break;
                    }

                    if (event) {
                        onMessage(event);
                    }

                }, faker.number.int({ min: 7000, max: 12000 }));

            }, 1500);

            return () => {
                clearTimeout(connectTimeout);
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
                setConnectionStatus('DISCONNECTED');
            };
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            setConnectionStatus('DISCONNECTED');
        }
    }, [isEnabled, currentUser, onMessage]);

    return { connectionStatus };
};