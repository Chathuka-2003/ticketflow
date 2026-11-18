pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    parameters {
        booleanParam(
            name: 'RUN_TRIVY_SCAN',
            defaultValue: true,
            description: 'Scan built Docker images for CRITICAL vulnerabilities using Trivy'
        )
        booleanParam(
            name: 'DEPLOY_TO_EKS',
            defaultValue: false,
            description: 'Push images to Amazon ECR and deploy to Amazon EKS'
        )
        string(
            name: 'AWS_REGION',
            defaultValue: 'eu-north-1',
            description: 'Target AWS region for ECR and EKS'
        )
        string(
            name: 'EKS_CLUSTER_NAME',
            defaultValue: 'ticketflow-prod',
            description: 'Target Amazon EKS cluster name'
        )
    }

    environment {
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test Microservices') {
            parallel {
                stage('auth-service') {
                    steps {
                        dir('services/auth-service') {
                            sh 'chmod +x mvnw && ./mvnw -B test'
                        }
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'services/auth-service/target/surefire-reports/*.xml'
                        }
                    }
                }
                stage('event-service') {
                    steps {
                        dir('services/event-service') {
                            sh 'chmod +x mvnw && ./mvnw -B test'
                        }
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'services/event-service/target/surefire-reports/*.xml'
                        }
                    }
                }
                stage('booking-service') {
                    steps {
                        dir('services/booking-service') {
                            sh 'chmod +x mvnw && ./mvnw -B test'
                        }
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'services/booking-service/target/surefire-reports/*.xml'
                        }
                    }
                }
                stage('payment-service') {
                    steps {
                        dir('services/payment-service') {
                            sh 'chmod +x mvnw && ./mvnw -B test'
                        }
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'services/payment-service/target/surefire-reports/*.xml'
                        }
                    }
                }
                stage('notification-service') {
                    steps {
                        dir('services/notification-service') {
                            sh 'chmod +x mvnw && ./mvnw -B test'
                        }
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'services/notification-service/target/surefire-reports/*.xml'
                        }
                    }
                }
                stage('api-gateway') {
                    steps {
                        dir('services/api-gateway') {
                            sh 'chmod +x mvnw && ./mvnw -B test'
                        }
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'services/api-gateway/target/surefire-reports/*.xml'
                        }
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    def services = [
                        'auth-service'        : 'services/auth-service',
                        'event-service'       : 'services/event-service',
                        'booking-service'     : 'services/booking-service',
                        'payment-service'     : 'services/payment-service',
                        'notification-service': 'services/notification-service',
                        'api-gateway'         : 'services/api-gateway',
                        'frontend'            : 'frontend/ticketflow-ui'
                    ]
                    def builds = [:]
                    services.each { name, path ->
                        builds[name] = {
                            sh "docker build -t ticketflow/${name}:${IMAGE_TAG} -t ticketflow/${name}:latest ${path}"
                        }
                    }
                    parallel builds
                }
            }
        }

        stage('Security Scan (Trivy)') {
            when {
                expression { return params.RUN_TRIVY_SCAN }
            }
            steps {
                script {
                    def images = [
                        'auth-service',
                        'event-service',
                        'booking-service',
                        'payment-service',
                        'notification-service',
                        'api-gateway',
                        'frontend'
                    ]
                    for (img in images) {
                        sh """
                            docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                              aquasec/trivy:latest image \
                              --severity CRITICAL --ignore-unfixed --exit-code 1 \
                              ticketflow/${img}:${IMAGE_TAG}
                        """
                    }
                }
            }
        }

        stage('Push to ECR & Deploy to EKS') {
            when {
                expression { return params.DEPLOY_TO_EKS }
            }
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-ticketflow-creds'
                ]]) {
                    sh '''
                        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
                        ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
                        aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

                        for svc in auth-service event-service booking-service payment-service notification-service api-gateway frontend; do
                          docker tag "ticketflow/${svc}:${IMAGE_TAG}" "${ECR_REGISTRY}/ticketflow/${svc}:${IMAGE_TAG}"
                          docker tag "ticketflow/${svc}:${IMAGE_TAG}" "${ECR_REGISTRY}/ticketflow/${svc}:latest"
                          docker push "${ECR_REGISTRY}/ticketflow/${svc}:${IMAGE_TAG}"
                          docker push "${ECR_REGISTRY}/ticketflow/${svc}:latest"
                        done

                        aws eks update-kubeconfig --region "${AWS_REGION}" --name "${EKS_CLUSTER_NAME}"
                        sed -e "s|ticketflow/\\(.*\\):local|${ECR_REGISTRY}/ticketflow/\\1:${IMAGE_TAG}|g" \
                            k8s/04-microservices.yaml | kubectl apply -f -
                        kubectl rollout status deployment/api-gateway -n ticketflow --timeout=180s
                    '''
                }
            }
        }
    }

    post {
        always {
            cleanWs(cleanWhenNotBuilt: false, deleteDirs: true, disableDeferredWipeout: true, notFailBuild: true)
        }
        success {
            echo "TicketFlow Jenkins pipeline #${env.BUILD_NUMBER} succeeded!"
        }
        failure {
            echo "TicketFlow Jenkins pipeline #${env.BUILD_NUMBER} failed."
        }
    }
}
