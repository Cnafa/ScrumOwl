import { faker } from 'https://cdn.skypack.dev/@faker-js/faker';
import { WorkItem, Status, Priority, WorkItemType, User, ActivityItem, Notification, NotificationType, CalendarEvent, Epic, Team, JoinRequest, InviteCode, JoinRequestStatus, Sprint, SprintState, EpicStatus } from '../types';
import { ALL_USERS, SPRINTS, GROUPS, PRIORITIES, STACKS, WORK_ITEM_TYPES, BOARDS, EPIC_COLORS, ALL_TEAMS, ROLES } from '../constants';

let MOCK_EPICS: Epic[] = [];
let MOCK_TEAMS: Team[] = ALL_TEAMS;
let MOCK_SPRINTS: Sprint[] = [];

const createMockEpic = (id: number): Epic => {
    const ease = faker.number.int({ min: 1, max: 10 });
    const impact = faker.number.int({ min: 1, max: 10 });
    const confidence = faker.number.int({ min: 1, max: 10 });
    
    const status = faker.helpers.arrayElement([
        EpicStatus.ACTIVE, EpicStatus.ACTIVE, EpicStatus.ACTIVE, // Higher chance of active
        EpicStatus.ON_HOLD,
        EpicStatus.DONE,
        EpicStatus.ARCHIVED,
    ]);

    const percentDoneWeighted = status === EpicStatus.DONE || status === EpicStatus.ARCHIVED 
        ? 100 
        : faker.number.int({ min: 0, max: 95 });

    return {
        id: `epic-${id}`,
        boardId: faker.helpers.arrayElement(BOARDS).id,
        name: faker.commerce.productName() + ' Initiative',
        aiSummary: faker.lorem.paragraph(),
        description: faker.lorem.paragraphs(5),
        attachments: [],
        ease,
        impact,
        confidence,
        iceScore: parseFloat(((ease + impact + confidence) / 3).toFixed(2)),
        createdAt: faker.date.past().toISOString(),
        updatedAt: faker.date.recent().toISOString(),
        color: faker.helpers.arrayElement(EPIC_COLORS),
        status,
        percentDoneWeighted,
        archivedAt: status === EpicStatus.ARCHIVED ? faker.date.past().toISOString() : undefined,
    };
};

export const getMockEpics = (count: number = 10): Epic[] => {
    if (MOCK_EPICS.length === 0) {
        MOCK_EPICS = Array.from({ length: count }, (_, i) => createMockEpic(i + 1));
    }
    return MOCK_EPICS;
}

const createMockSprint = (index: number): Sprint => {
    const isPast = index < 2;
    const isActive = index === 2;
    const startAt = isPast 
        ? faker.date.past({ years: 0.2 }) 
        : isActive 
        ? faker.date.recent({ days: 5 })
        : faker.date.soon({ days: 10 });
    
    const endAt = new Date(startAt);
    endAt.setDate(endAt.getDate() + 14);

    return {
        id: `sprint-${index + 1}`,
        boardId: BOARDS[0].id,
        number: index + 1,
        name: `Sprint 24.${String(index + 1).padStart(2, '0')}`,
        goal: faker.company.catchPhrase(),
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        state: isPast ? SprintState.CLOSED : isActive ? SprintState.ACTIVE : SprintState.PLANNED,
        epicIds: faker.helpers.arrayElements(MOCK_EPICS, faker.number.int({ min: 1, max: 3 })).map(e => e.id),
    };
};

export const getMockSprints = (count: number = 4): Sprint[] => {
    if (MOCK_SPRINTS.length === 0) {
        if (MOCK_EPICS.length === 0) getMockEpics();
        MOCK_SPRINTS = Array.from({ length: count }, (_, i) => createMockSprint(i));
    }
    return MOCK_SPRINTS;
};

export const getMockTeams = (): Team[] => {
    return MOCK_TEAMS;
};

export const getMockJoinRequests = (count: number = 2): JoinRequest[] => {
    const existingUserIds = ALL_USERS.map(u => u.id);
    const mockUsers = [ // Create users not already in the system
        { id: 'user-6', name: 'Frank Green', email: 'frank.g@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=frank' },
        { id: 'user-7', name: 'Grace Hall', email: 'grace.h@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=grace' },
    ].filter(u => !existingUserIds.includes(u.id));

    return Array.from({ length: Math.min(count, mockUsers.length) }, (_, i) => ({
        id: `req-${i + 1}`,
        user: mockUsers[i],
        status: JoinRequestStatus.PENDING,
        requestedAt: faker.date.recent().toISOString(),
    }));
};

export const getMockInviteCodes = (count: number = 2): InviteCode[] => {
    return [
        {
            code: 'sCrUm-oWl-2024',
            roleId: 'role-3', // Member
            uses: 3,
            maxUses: 10,
            expiresAt: faker.date.future({ years: 0.1 }).toISOString(),
            createdBy: 'user-1',
            createdAt: faker.date.past().toISOString(),
        },
        {
            code: 'pRoJ-phNX-ADMIN',
            roleId: 'role-2', // Admin
            uses: 0,
            maxUses: 1,
            expiresAt: faker.date.future({ years: 0.05 }).toISOString(),
            createdBy: 'user-1',
            createdAt: faker.date.recent().toISOString(),
        }
    ];
};

const createMockWorkItem = (id: number): WorkItem => {
    const reporter = faker.helpers.arrayElement(ALL_USERS);
    const assignee = faker.helpers.arrayElement(ALL_USERS);
    const type = faker.helpers.arrayElement(WORK_ITEM_TYPES.filter(t => t !== WorkItemType.EPIC)); // An item cannot be an Epic type
    const status = faker.helpers.arrayElement(Object.values(Status));
    const title = faker.hacker.phrase().replace(/^./, (letter) => letter.toUpperCase());

    const activeEpics = MOCK_EPICS.filter(e => e.status === EpicStatus.ACTIVE);
    const linkedEpic = faker.datatype.boolean(0.6) && activeEpics.length > 0 ? faker.helpers.arrayElement(activeEpics) : undefined;
    const linkedTeam = faker.datatype.boolean(0.4) ? faker.helpers.arrayElement(MOCK_TEAMS) : undefined;
    
    const potentialWatchers = ALL_USERS.filter(u => u.id !== assignee.id && u.id !== reporter.id);

    return {
        id: `PROJ-${id}`,
        boardId: faker.helpers.arrayElement(BOARDS).id, // US-23: Assign to a board
        title: title,
        summary: faker.lorem.sentence(), // US-18: Add mock summary
        description: faker.lorem.paragraphs(3),
        type,
        status,
        assignee,
        reporter,
        priority: faker.helpers.arrayElement(PRIORITIES),
        sprint: faker.helpers.arrayElement(SPRINTS),
        group: faker.helpers.arrayElement(GROUPS),
        stack: faker.helpers.arrayElement(STACKS),
        estimationPoints: faker.helpers.arrayElement([1, 2, 3, 5, 8, 13]),
        effortHours: faker.number.int({ min: 1, max: 40 }),
        dueDate: faker.date.future().toISOString(),
        labels: faker.helpers.arrayElements(faker.definitions.hacker.adjective, faker.number.int({ min: 0, max: 3 })),
        checklist: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, (_, i) => ({
            id: `check-${id}-${i}`,
            text: faker.lorem.sentence(),
            isCompleted: faker.datatype.boolean(),
        })),
        attachments: [],
        watchers: faker.helpers.arrayElements(potentialWatchers, faker.number.int({min: 0, max: 2})).map(u => u.id),
        createdAt: faker.date.past().toISOString(),
        updatedAt: faker.date.recent().toISOString(),
        version: faker.number.int({ min: 1, max: 10 }),
        parentId: id > 5 ? `PROJ-${faker.number.int({ min: 2, max: 4 })}` : undefined,
        childrenIds: id === 2 ? [`PROJ-6`, `PROJ-7`] : undefined,
        epicId: linkedEpic?.id,
        epicInfo: linkedEpic ? { id: linkedEpic.id, name: linkedEpic.name, color: linkedEpic.color } : undefined,
        teamId: linkedTeam?.id,
        teamInfo: linkedTeam ? { id: linkedTeam.id, name: linkedTeam.name } : undefined,
    };
};

const createMockActivity = (id: number): ActivityItem => {
    const user = faker.helpers.arrayElement(ALL_USERS);
    const type = faker.helpers.arrayElement(['COMMENT', 'TRANSITION'] as const);

    if (type === 'COMMENT') {
        return {
            type: 'COMMENT',
            data: {
                id: `comment-${id}`,
                user,
                content: faker.lorem.sentence(),
                mentions: [],
                timestamp: faker.date.recent().toISOString(),
            }
        };
    } else {
        return {
            type: 'TRANSITION',
            data: {
                id: `trans-${id}`,
                user,
                fromStatus: faker.helpers.arrayElement([Status.TODO, Status.IN_PROGRESS]),
                toStatus: faker.helpers.arrayElement([Status.IN_PROGRESS, Status.IN_REVIEW]),
                timestamp: faker.date.recent().toISOString(),
            }
        };
    }
};

const createMockNotification = (id: number, workItem: WorkItem): Notification => {
    const actor = faker.helpers.arrayElement(ALL_USERS);
    const type = faker.helpers.arrayElement(Object.values(NotificationType));
    
    let target: Notification['target'] = {
        entity: 'work_item',
        id: workItem.id,
    };

    if (type === NotificationType.ITEM_UPDATED) {
        target.section = faker.helpers.arrayElement(['dueDate', 'priority', 'description']);
    }

    return {
        id: `notif-${id}`,
        type,
        actor,
        workItem: { id: workItem.id, title: workItem.title },
        timestamp: faker.date.recent().toISOString(),
        isRead: faker.datatype.boolean({ probability: 0.7 }), // 70% chance of being read
        target,
    };
};

const createMockEvent = (id: number, workItem?: WorkItem): CalendarEvent => ({
    id: `event-${id}`,
    title: workItem ? `Review: ${workItem.id}` : faker.lorem.words(3),
    start: faker.date.soon(),
    end: faker.date.soon({ days: 1 }),
    allDay: faker.datatype.boolean(),
    linkedWorkItemId: workItem?.id,
    attendees: faker.helpers.arrayElements(ALL_USERS, 3),
    createdBy: faker.helpers.arrayElement(ALL_USERS),
});

export const getMockWorkItems = (count: number = 30): WorkItem[] => {
    // Ensure epics are created first so work items can link to them
    if (MOCK_EPICS.length === 0) {
        getMockEpics();
    }
    return Array.from({ length: count }, (_, i) => createMockWorkItem(i + 1));
};

export const getMockActivities = (count: number = 10): ActivityItem[] => {
    return Array.from({ length: count }, (_, i) => createMockActivity(i + 1)).sort((a,b) => new Date(b.data.timestamp).getTime() - new Date(a.data.timestamp).getTime());
};

export const getMockNotifications = (count: number = 15, workItems: WorkItem[]): Notification[] => {
    return Array.from({ length: count }, (_, i) => createMockNotification(i + 1, faker.helpers.arrayElement(workItems))).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const getMockCalendarEvents = (count: number = 10, workItems: WorkItem[]): CalendarEvent[] => {
    return Array.from({ length: count }, (_, i) => createMockEvent(i + 1, faker.datatype.boolean() ? faker.helpers.arrayElement(workItems) : undefined));
};
