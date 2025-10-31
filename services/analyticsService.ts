// services/analyticsService.ts
import { WorkItem, Epic, User, Status, EpicProgressReportData, AssigneeWorkloadData } from '../types';
import { SPRINTS, WIP_LIMIT, ALL_USERS } from '../constants';

// --- Burndown Chart Logic ---
export const getBurndownData = (sprintId: string, workItems: WorkItem[]) => {
    const sprintItems = workItems.filter(item => item.sprint === sprintId);
    if (sprintItems.length === 0) return { labels: [], ideal: [], actual: [] };
    
    const sprintDuration = 14; // Assume 14 days for mock
    const labels = Array.from({ length: sprintDuration + 1 }, (_, i) => `Day ${i}`);
    
    const totalPoints = sprintItems.reduce((sum, item) => sum + (item.estimationPoints || 0), 0);
    
    // Ideal line: linear descent
    const ideal = labels.map((_, i) => totalPoints - (totalPoints / sprintDuration) * i);
    
    // Actual line: calculated based on completion date
    let remainingPoints = totalPoints;
    const actual = [totalPoints];
    for (let i = 1; i <= sprintDuration; i++) {
        // This is a simplification. A real implementation would use transition logs.
        const completedThisDay = sprintItems.filter(item => {
            const dayOfSprint = (new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime()) / (1000 * 3600 * 24);
            return item.status === Status.DONE && Math.ceil(dayOfSprint) === i;
        }).reduce((sum, item) => sum + (item.estimationPoints || 0), 0);
        
        remainingPoints -= completedThisDay;
        actual.push(remainingPoints);
    }

    return { labels, ideal, actual, totalPoints };
};

// --- Velocity Chart Logic ---
export const getVelocityData = (workItems: WorkItem[]) => {
    const velocityBySprint: Record<string, number> = {};
    SPRINTS.forEach(sprint => {
        velocityBySprint[sprint] = 0;
    });

    workItems
        .filter(item => item.status === Status.DONE && item.sprint)
        .forEach(item => {
            if (velocityBySprint.hasOwnProperty(item.sprint)) {
                velocityBySprint[item.sprint] += item.estimationPoints || 0;
            }
        });
        
    const labels = Object.keys(velocityBySprint);
    const data = Object.values(velocityBySprint);
    const average = data.reduce((a, b) => a + b, 0) / data.length;

    return { labels, data, average };
};


// --- Epics Progress Logic ---
export const getEpicProgressData = (epics: Epic[], workItems: WorkItem[]): EpicProgressReportData[] => {
    return epics.map(epic => {
        const childItems = workItems.filter(item => item.epicId === epic.id);
        const totalItems = childItems.length;
        const doneItems = childItems.filter(item => item.status === Status.DONE).length;
        
        const totalEstimation = childItems.reduce((sum, item) => sum + (item.estimationPoints || 0), 0);
        const doneEstimation = childItems
            .filter(item => item.status === Status.DONE)
            .reduce((sum, item) => sum + (item.estimationPoints || 0), 0);
            
        const progress = totalEstimation > 0 ? (doneEstimation / totalEstimation) * 100 : 0;
        
        return {
            epic,
            totalItems,
            doneItems,
            totalEstimation,
            doneEstimation,
            progress,
        };
    }).sort((a,b) => b.epic.iceScore - a.epic.iceScore);
};

// --- Assignee Workload Logic ---
export const getAssigneeWorkloadData = (workItems: WorkItem[]): AssigneeWorkloadData[] => {
    const workloadMap: Record<string, { open: number, inProgress: number, inReview: number, totalLoad: number }> = {};

    ALL_USERS.forEach(user => {
        workloadMap[user.id] = { open: 0, inProgress: 0, inReview: 0, totalLoad: 0 };
    });

    workItems.forEach(item => {
        if (item.assignee && workloadMap[item.assignee.id]) {
            if (item.status === Status.TODO || item.status === Status.BACKLOG) {
                workloadMap[item.assignee.id].open++;
            } else if (item.status === Status.IN_PROGRESS) {
                workloadMap[item.assignee.id].inProgress++;
            } else if (item.status === Status.IN_REVIEW) {
                workloadMap[item.assignee.id].inReview++;
            }
        }
    });

    return ALL_USERS.map(user => {
        const stats = workloadMap[user.id];
        const totalLoad = stats.open + stats.inProgress + stats.inReview;
        return {
            assignee: user,
            ...stats,
            totalLoad,
            wipBreached: stats.inProgress > WIP_LIMIT,
        };
    }).sort((a,b) => b.totalLoad - a.totalLoad);
};
