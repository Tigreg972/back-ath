import { IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}