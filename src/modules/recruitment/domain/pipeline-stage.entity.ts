import { ValidationError } from '../../../shared/errors/index.js';

export type StageType = 'applied' | 'screening' | 'assessment' | 'interview' | 'trial' | 'decision' | 'offer' | 'hired';

export interface PipelineStageProps {
  id: string;
  organizationId: string;
  stageCode: string;
  name: string;
  stageType: StageType;
  orderIndex: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class PipelineStageEntity {
  public readonly id: string;
  public readonly organizationId: string;
  public stageCode: string;
  public name: string;
  public stageType: StageType;
  public orderIndex: number;
  public isSystem: boolean;
  public isActive: boolean;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: PipelineStageProps) {
    this.validate(props);
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.stageCode = props.stageCode.trim().toLowerCase();
    this.name = props.name.trim();
    this.stageType = props.stageType;
    this.orderIndex = props.orderIndex;
    this.isSystem = props.isSystem;
    this.isActive = props.isActive;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
  }

  private validate(props: PipelineStageProps): void {
    if (!props.stageCode || props.stageCode.trim() === '') {
      throw new ValidationError('Stage code is required');
    }
    if (!props.name || props.name.trim() === '') {
      throw new ValidationError('Stage name is required');
    }
  }
}
