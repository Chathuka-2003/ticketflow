# ---------- build stage ----------
FROM eclipse-temurin:24-jdk AS build
WORKDIR /workspace

ENV MAVEN_OPTS="-Dhttps.protocols=TLSv1.2 -Dmaven.wagon.http.retryHandler.count=5 -Daether.connector.http.retryHandler.count=5 -Dmaven.wagon.http.pool=false"

COPY . .
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw \
    && if ! ls target/*.jar >/dev/null 2>&1; then \
         ./mvnw -B -q package -DskipTests; \
       fi

# ---------- runtime stage ----------
FROM eclipse-temurin:24-jre
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --no-create-home app
COPY --from=build /workspace/target/*.jar app.jar
USER app

EXPOSE 8081
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
