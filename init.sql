-- Initial database setup for Bloom Energy Contract System
-- This script runs when the PostgreSQL container starts

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS contracts;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set search path
ALTER DATABASE bloom_contracts SET search_path TO contracts, public;

-- Create audit function for tracking changes
CREATE OR REPLACE FUNCTION audit.audit_trigger() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit.contract_audit (
            table_name, operation, contract_id, old_data, new_data, changed_by, changed_at
        ) VALUES (
            TG_TABLE_NAME, TG_OP, NEW.id, NULL, row_to_json(NEW), COALESCE(current_setting('app.current_user', true), 'system'), NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit.contract_audit (
            table_name, operation, contract_id, old_data, new_data, changed_by, changed_at
        ) VALUES (
            TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(OLD), row_to_json(NEW), COALESCE(current_setting('app.current_user', true), 'system'), NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit.contract_audit (
            table_name, operation, contract_id, old_data, new_data, changed_by, changed_at
        ) VALUES (
            TG_TABLE_NAME, TG_OP, OLD.id, row_to_json(OLD), NULL, COALESCE(current_setting('app.current_user', true), 'system'), NOW()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;