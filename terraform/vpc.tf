data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "ticketflow" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "ticketflow-${var.environment}-vpc"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.ticketflow.id

  tags = {
    Name = "ticketflow-${var.environment}-igw"
  }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.ticketflow.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index + 1)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                                                    = "ticketflow-${var.environment}-public-${count.index + 1}"
    "kubernetes.io/role/elb"                                = "1"
    "kubernetes.io/cluster/ticketflow-${var.environment}"   = "shared"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.ticketflow.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 11)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name                                                    = "ticketflow-${var.environment}-private-${count.index + 1}"
    "kubernetes.io/role/internal-elb"                       = "1"
    "kubernetes.io/cluster/ticketflow-${var.environment}"   = "shared"
  }
}
