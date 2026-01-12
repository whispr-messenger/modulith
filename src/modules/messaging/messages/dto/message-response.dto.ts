import { ApiProperty } from '@nestjs/swagger';
import { MessageType } from '../../entities';
import { DeliveryStatusDto } from './delivery-status.dto';
import { MessageReactionDto } from './message-reaction.dto';

export class MessageResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    conversationId: string;

    @ApiProperty()
    senderId: string;

    @ApiProperty({ enum: MessageType })
    messageType: MessageType;

    @ApiProperty({ required: false, nullable: true })
    content: string | null;

    @ApiProperty({ type: 'object', additionalProperties: true })
    metadata: Record<string, any>;

    @ApiProperty({ required: false, nullable: true, type: 'integer' })
    clientRandom: number | null;

    @ApiProperty({ required: false, nullable: true })
    replyToId: string | null;

    @ApiProperty()
    sentAt: Date;

    @ApiProperty({ required: false, nullable: true })
    editedAt: Date | null;

    @ApiProperty()
    isDeleted: boolean;

    @ApiProperty()
    deletedForEveryone: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty({ required: false, nullable: true, type: MessageResponseDto })
    replyTo?: MessageResponseDto | null;

    @ApiProperty({ type: [DeliveryStatusDto], required: false })
    deliveryStatuses?: DeliveryStatusDto[];

    @ApiProperty({ type: [MessageReactionDto], required: false })
    reactions?: MessageReactionDto[];

    @ApiProperty({ required: false })
    deliveredCount?: number;

    @ApiProperty({ required: false })
    readCount?: number;
}
