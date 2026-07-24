terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Free Tier Security Group
resource "aws_security_group" "trafficpay_sg" {
  name        = "trafficpay-backend-sg"
  description = "Security group for TrafficPay backend microservices free tier EC2"

  # SSH Access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP Web Traffic
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # API Gateway Port
  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound Rule (Allow All)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "trafficpay-free-tier-sg"
  }
}

# AWS Free Tier EC2 Instance (t2.micro / t3.micro)
resource "aws_instance" "trafficpay_server" {
  ami           = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS (us-east-1)
  instance_type = var.instance_type      # t2.micro (AWS Free Tier)

  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.trafficpay_sg.id]

  root_block_device {
    volume_size           = 8 # 8GB Free Tier Eligible GP2/GP3
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name        = "TrafficPay-Backend-Server"
    Environment = "FreeTier-Production"
  }
}

output "public_ip" {
  value       = aws_instance.trafficpay_server.public_ip
  description = "Public IP Address of the TrafficPay EC2 Backend Instance"
}
