variable "aws_region" {
  description = "AWS region for TicketFlow cloud infrastructure"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Deployment environment name (staging or prod)"
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block for the TicketFlow VPC"
  type        = string
  default     = "10.42.0.0/16"
}

variable "eks_cluster_version" {
  description = "Kubernetes version for Amazon EKS"
  type        = string
  default     = "1.31"
}

variable "eks_node_instance_types" {
  description = "EC2 instance types for EKS managed worker nodes"
  type        = list(string)
  default     = ["t3.large"]
}

variable "db_instance_class" {
  description = "Amazon RDS PostgreSQL instance class"
  type        = string
  default     = "db.t4g.medium"
}

variable "db_master_username" {
  description = "Master username for RDS PostgreSQL"
  type        = string
  default     = "ticketflow"
}

variable "db_master_password" {
  description = "Master password for RDS PostgreSQL"
  type        = string
  sensitive   = true
  default     = "ChangeMeInSecretsManager123!"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type for 10-minute seat hold locks"
  type        = string
  default     = "cache.t4g.small"
}
