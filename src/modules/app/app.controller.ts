import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller()
export class AppController {
    @Get()
    @ApiExcludeEndpoint()
    getHello(): string {
        return 'Welcome to Whispr Messenger API! Visit /api/swagger for documentation.';
    }

    @Get('api')
    @Redirect('/api/swagger', 301)
    @ApiExcludeEndpoint()
    redirectToSwagger() {
        return;
    }
}
