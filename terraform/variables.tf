variable "aws_region" {
  default     = "us-east-1"
  description = "AWS region for deployment"
}

variable "instance_type" {
  default     = "t2.micro" # AWS Free Tier Eligible (1 vCPU, 1 GB RAM)
  description = "EC2 Instance type"
}

variable "key_name" {
  default     = "trafficpay-ec2-key"
  description = "SSH Key pair name for EC2 access"
}
