output "eks_cluster_name" {
  description = "Amazon EKS cluster name"
  value       = aws_eks_cluster.ticketflow.name
}

output "eks_cluster_endpoint" {
  description = "Amazon EKS API server endpoint"
  value       = aws_eks_cluster.ticketflow.endpoint
}

output "rds_postgres_endpoint" {
  description = "Amazon RDS PostgreSQL 16 endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "elasticache_redis_endpoint" {
  description = "Amazon ElastiCache Redis 7 primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "ecr_repository_urls" {
  description = "Amazon ECR repository URLs for all 7 TicketFlow containers"
  value       = { for k, repo in aws_ecr_repository.microservices : k => repo.repository_url }
}
