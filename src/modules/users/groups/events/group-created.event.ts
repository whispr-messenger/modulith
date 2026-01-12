export class GroupCreatedEvent {
  constructor(
    public readonly groupId: string,
    public readonly name: string,
    public readonly pictureUrl?: string,
    public readonly memberCount: number = 1,
  ) {}
}
