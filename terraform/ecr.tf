locals {
  services = [
    "frontend",
    "api-gateway",
    "auth-service",
    "event-service",
    "booking-service",
    "payment-service",
    "notification-service",
  ]
}

resource "aws_ecr_repository" "microservices" {
  for_each             = toset(local.services)
  name                 = "ticketflow/${each.value}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}
