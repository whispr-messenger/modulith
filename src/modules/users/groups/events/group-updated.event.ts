export class GroupUpdatedEvent {
  constructor(
    public readonly groupId: string,
    public readonly name?: string,
    public readonly pictureUrl?: string,
    public readonly isActive?: boolean,
  ) {}
}
