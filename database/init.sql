-- Excitel Dashboard Database Schema

-- Months table
CREATE TABLE months (
    id VARCHAR(20) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    month_id VARCHAR(20) REFERENCES months(id),
    session_start_date TIMESTAMP NOT NULL,
    session_end_date TIMESTAMP NOT NULL,
    usage_time INTEGER NOT NULL,
    usage_volume DECIMAL(12, 2) NOT NULL,
    ip_address VARCHAR(100),
    termination_cause VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sync metadata table
CREATE TABLE sync_metadata (
    id SERIAL PRIMARY KEY,
    month_id VARCHAR(20) UNIQUE NOT NULL,
    last_sync_at TIMESTAMP NOT NULL,
    session_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sessions_month_id ON sessions(month_id);
CREATE INDEX idx_sessions_start_date ON sessions(session_start_date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_months_updated_at
    BEFORE UPDATE ON months
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
