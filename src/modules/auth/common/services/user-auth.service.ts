import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserAuth } from "../entities/user-auth.entity";
import { Repository } from "typeorm";

@Injectable()
export class UserAuthService {

    constructor(
        @InjectRepository(UserAuth)
        private readonly userAuthRepository: Repository<UserAuth>,
    ) {}


    public async findByPhoneNumber(phoneNumber: string): Promise<UserAuth | null> {
        return this.userAuthRepository.findOne({ where: { phoneNumber } });
    }

    public async findById(id: string): Promise<UserAuth | null> {
        return this.userAuthRepository.findOne({ where: { id } });
    }

    public createUser(data: Partial<UserAuth>): UserAuth {
        return this.userAuthRepository.create(data);
    }

    public async saveUser(user: UserAuth): Promise<UserAuth> {
        return this.userAuthRepository.save(user);
    }

}