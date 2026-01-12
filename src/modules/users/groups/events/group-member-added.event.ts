export class GroupMemberAddedEvent {
  constructor(
    public readonly groupId: string,
    public readonly userId: string,
    public readonly memberCount: number,
  ) {}
}
