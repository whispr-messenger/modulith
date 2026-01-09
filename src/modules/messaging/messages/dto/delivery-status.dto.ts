import { ApiProperty } from '@nestjs/swagger';

export class DeliveryStatusDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    messageId: string;

    @ApiProperty()
    userId: string;

    @ApiProperty({ required: false, nullable: true })
    deliveredAt: Date | null;

    @ApiProperty({ required: false, nullable: true })
    readAt: Date | null;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
