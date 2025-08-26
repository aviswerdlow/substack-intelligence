-- Create a view 'reports' that maps to 'report_history' table
-- This allows API routes to use 'reports' while the actual table is 'report_history'
CREATE OR REPLACE VIEW reports AS
SELECT * FROM report_history;

-- Create instead of triggers to make the view updatable
CREATE OR REPLACE FUNCTION insert_report() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO report_history VALUES (NEW.*);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_report() RETURNS TRIGGER AS $$
BEGIN
  UPDATE report_history 
  SET 
    report_type = NEW.report_type,
    report_date = NEW.report_date,
    generated_at = NEW.generated_at,
    recipients_count = NEW.recipients_count,
    companies_count = NEW.companies_count,
    mentions_count = NEW.mentions_count,
    email_id = NEW.email_id,
    pdf_size = NEW.pdf_size,
    status = NEW.status,
    error_message = NEW.error_message,
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_report() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM report_history WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create the INSTEAD OF triggers
CREATE TRIGGER reports_insert_trigger
  INSTEAD OF INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION insert_report();

CREATE TRIGGER reports_update_trigger
  INSTEAD OF UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_report();

CREATE TRIGGER reports_delete_trigger
  INSTEAD OF DELETE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION delete_report();

-- Grant permissions on the view
GRANT SELECT, INSERT, UPDATE, DELETE ON reports TO authenticated;
GRANT ALL ON reports TO service_role;