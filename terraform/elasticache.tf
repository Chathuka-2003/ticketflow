resource "aws_elasticache_subnet_group" "redis" {
  name       = "ticketflow-${var.environment}-redis-subnets"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_security_group" "redis" {
  name        = "ticketflow-${var.environment}-redis-sg"
  description = "Allow Redis 6379 from EKS nodes for atomic 10m seat hold locks"
  vpc_id      = aws_vpc.ticketflow.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "ticketflow-${var.environment}-redis"
  description                = "TicketFlow Redis 7 cluster for 10m seat TTL locks"
  engine                     = "redis"
  engine_version             = "7.1"
  node_type                  = var.redis_node_type
  num_cache_clusters         = 2
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]
  automatic_failover_enabled = true
  at_rest_encryption_enabled = true
}
