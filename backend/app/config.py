from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- PostgreSQL ---
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str = "wikiquran"

    # --- Neo4j ---
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str

    # --- App ---
    APP_ENV: str = "development"
    APP_VERSION: str = "0.3.0"

    @property
    def postgres_url(self) -> str:
        """Construit l'URL de connexion PostgreSQL pour SQLAlchemy."""
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    class Config:
        env_file = "../.env"          # Lit le fichier .env à la racine du projet
        env_file_encoding = "utf-8"
        extra = "ignore"           # Ignore les variables .env non déclarées ici


# Instance globale — importée partout dans l'app
settings = Settings()
