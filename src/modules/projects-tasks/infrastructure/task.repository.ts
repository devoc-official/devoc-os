import { getDbClient, DbClient } from '../../../database/index.js';
import {
  Task,
  TaskDependency,
  TaskStatus,
  TaskPriority,
  TaskType,
  DependencyType,
} from '../domain/task.entity.js';

interface RawTaskRow {
  id: string;
  organization_id: string;
  project_id: string;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  task_key: string;
  task_type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  start_at: Date | null;
  due_at: Date | null;
  completed_at: Date | null;
  created_by_person_id: string;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface RawTaskDependencyRow {
  id: string;
  organization_id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: DependencyType;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export class TaskRepository {
  private static mapRowToTask(row: RawTaskRow): Task {
    return {
      id: row.id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      parentTaskId: row.parent_task_id,
      title: row.title,
      description: row.description,
      taskKey: row.task_key,
      taskType: row.task_type,
      status: row.status,
      priority: row.priority,
      startAt: row.start_at ? new Date(row.start_at) : null,
      dueAt: row.due_at ? new Date(row.due_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      createdByPersonId: row.created_by_person_id,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private static mapRowToDependency(row: RawTaskDependencyRow): TaskDependency {
    return {
      id: row.id,
      organizationId: row.organization_id,
      taskId: row.task_id,
      dependsOnTaskId: row.depends_on_task_id,
      dependencyType: row.dependency_type,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
    };
  }

  public static async createTask(
    data: {
      organizationId: string;
      projectId: string;
      parentTaskId?: string | null;
      title: string;
      description?: string | null;
      taskKey: string;
      taskType?: TaskType;
      status?: TaskStatus;
      priority?: TaskPriority;
      startAt?: Date | null;
      dueAt?: Date | null;
      createdByPersonId: string;
      metadata?: Record<string, unknown>;
    },
    client?: DbClient
  ): Promise<Task> {
    const db = client || getDbClient();
    const res = await db.query<RawTaskRow>(
      `INSERT INTO tasks (
        organization_id, project_id, parent_task_id, title, description,
        task_key, task_type, status, priority, start_at, due_at,
        created_by_person_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;`,
      [
        data.organizationId,
        data.projectId,
        data.parentTaskId || null,
        data.title.trim(),
        data.description || null,
        data.taskKey.trim().toUpperCase(),
        data.taskType || 'task',
        data.status || 'backlog',
        data.priority || 'medium',
        data.startAt ? data.startAt.toISOString() : null,
        data.dueAt ? data.dueAt.toISOString() : null,
        data.createdByPersonId,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToTask(res.rows[0]);
  }

  public static async findTaskById(organizationId: string, taskId: string): Promise<Task | null> {
    const db = getDbClient();
    const res = await db.query<RawTaskRow>(
      `SELECT * FROM tasks WHERE id = $1 AND organization_id = $2;`,
      [taskId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToTask(res.rows[0]);
  }

  public static async findTaskByKey(projectId: string, taskKey: string): Promise<Task | null> {
    const db = getDbClient();
    const res = await db.query<RawTaskRow>(
      `SELECT * FROM tasks WHERE project_id = $1 AND task_key = $2;`,
      [projectId, taskKey.trim().toUpperCase()]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToTask(res.rows[0]);
  }

  public static async findAllTasks(
    organizationId: string,
    filters?: {
      projectId?: string;
      parentTaskId?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      taskType?: TaskType;
      createdByPersonId?: string;
    }
  ): Promise<Task[]> {
    const db = getDbClient();
    let query = `SELECT * FROM tasks WHERE organization_id = $1`;
    const params: unknown[] = [organizationId];

    if (filters?.projectId) {
      params.push(filters.projectId);
      query += ` AND project_id = $${params.length}`;
    }
    if (filters?.parentTaskId !== undefined) {
      if (filters.parentTaskId === null) {
        query += ` AND parent_task_id IS NULL`;
      } else {
        params.push(filters.parentTaskId);
        query += ` AND parent_task_id = $${params.length}`;
      }
    }
    if (filters?.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }
    if (filters?.priority) {
      params.push(filters.priority);
      query += ` AND priority = $${params.length}`;
    }
    if (filters?.taskType) {
      params.push(filters.taskType);
      query += ` AND task_type = $${params.length}`;
    }
    if (filters?.createdByPersonId) {
      params.push(filters.createdByPersonId);
      query += ` AND created_by_person_id = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC;`;

    const res = await db.query<RawTaskRow>(query, params);
    return res.rows.map((row) => this.mapRowToTask(row));
  }

  public static async updateTask(
    organizationId: string,
    taskId: string,
    updates: {
      title?: string;
      description?: string | null;
      priority?: TaskPriority;
      startAt?: Date | null;
      dueAt?: Date | null;
      parentTaskId?: string | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Task | null> {
    const db = getDbClient();
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [taskId, organizationId];

    if (updates.title !== undefined) {
      params.push(updates.title.trim());
      setClauses.push(`title = $${params.length}`);
    }
    if (updates.description !== undefined) {
      params.push(updates.description);
      setClauses.push(`description = $${params.length}`);
    }
    if (updates.priority !== undefined) {
      params.push(updates.priority);
      setClauses.push(`priority = $${params.length}`);
    }
    if (updates.startAt !== undefined) {
      params.push(updates.startAt ? updates.startAt.toISOString() : null);
      setClauses.push(`start_at = $${params.length}`);
    }
    if (updates.dueAt !== undefined) {
      params.push(updates.dueAt ? updates.dueAt.toISOString() : null);
      setClauses.push(`due_at = $${params.length}`);
    }
    if (updates.parentTaskId !== undefined) {
      params.push(updates.parentTaskId);
      setClauses.push(`parent_task_id = $${params.length}`);
    }
    if (updates.metadata !== undefined) {
      params.push(JSON.stringify(updates.metadata));
      setClauses.push(`metadata = $${params.length}`);
    }

    const res = await db.query<RawTaskRow>(
      `UPDATE tasks
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      params
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToTask(res.rows[0]);
  }

  public static async updateTaskStatus(
    organizationId: string,
    taskId: string,
    newStatus: TaskStatus,
    completedAt?: Date | null
  ): Promise<Task | null> {
    const db = getDbClient();
    const res = await db.query<RawTaskRow>(
      `UPDATE tasks
       SET status = $3, completed_at = $4, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      [taskId, organizationId, newStatus, completedAt ? completedAt.toISOString() : null]
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToTask(res.rows[0]);
  }

  // --- TASK DEPENDENCIES ---
  public static async addDependency(
    organizationId: string,
    taskId: string,
    dependsOnTaskId: string,
    dependencyType: DependencyType = 'blocks',
    metadata?: Record<string, unknown>
  ): Promise<TaskDependency> {
    const db = getDbClient();
    const res = await db.query<RawTaskDependencyRow>(
      `INSERT INTO task_dependencies (
        organization_id, task_id, depends_on_task_id, dependency_type, metadata
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *;`,
      [organizationId, taskId, dependsOnTaskId, dependencyType, JSON.stringify(metadata || {})]
    );
    return this.mapRowToDependency(res.rows[0]);
  }

  public static async findTaskDependencies(
    organizationId: string,
    taskId: string
  ): Promise<TaskDependency[]> {
    const db = getDbClient();
    const res = await db.query<RawTaskDependencyRow>(
      `SELECT * FROM task_dependencies WHERE task_id = $1 AND organization_id = $2;`,
      [taskId, organizationId]
    );
    return res.rows.map((row) => this.mapRowToDependency(row));
  }

  public static async findTaskDependents(
    organizationId: string,
    taskId: string
  ): Promise<TaskDependency[]> {
    const db = getDbClient();
    const res = await db.query<RawTaskDependencyRow>(
      `SELECT * FROM task_dependencies WHERE depends_on_task_id = $1 AND organization_id = $2;`,
      [taskId, organizationId]
    );
    return res.rows.map((row) => this.mapRowToDependency(row));
  }

  public static async findAllOrganizationDependencies(
    organizationId: string
  ): Promise<TaskDependency[]> {
    const db = getDbClient();
    const res = await db.query<RawTaskDependencyRow>(
      `SELECT * FROM task_dependencies WHERE organization_id = $1;`,
      [organizationId]
    );
    return res.rows.map((row) => this.mapRowToDependency(row));
  }

  public static async removeDependency(
    organizationId: string,
    taskId: string,
    dependsOnTaskId: string
  ): Promise<boolean> {
    const db = getDbClient();
    const res = await db.query(
      `DELETE FROM task_dependencies
       WHERE (id = $2 OR depends_on_task_id = $2) AND task_id = $1 AND organization_id = $3
       RETURNING id;`,
      [taskId, dependsOnTaskId, organizationId]
    );
    return res.rows.length > 0;
  }
}
