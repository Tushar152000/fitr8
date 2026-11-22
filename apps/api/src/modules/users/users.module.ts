import { Global, Module } from "@nestjs/common";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";
import { WelcomeEmailJob } from "./welcome-email.job.js";

/** Global because nearly every module needs the user's timezone. Also sends the welcome email. */
@Global()
@Module({
  controllers: [UsersController],
  providers: [UsersService, WelcomeEmailJob],
  exports: [UsersService],
})
export class UsersModule {}
