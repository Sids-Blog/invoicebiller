-- Add company prefix field
ALTER TABLE companies ADD COLUMN IF NOT EXISTS prefix VARCHAR(10) UNIQUE;

-- Create sequence tracking table with month granularity
CREATE TABLE IF NOT EXISTS invoice_sequences (
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  type VARCHAR(10) NOT NULL,
  last_number INTEGER DEFAULT 0,
  PRIMARY KEY (company_id, year, month, type)
);

-- Updated invoice number generation function
CREATE OR REPLACE FUNCTION generate_invoice_number(
  p_company_id UUID, 
  p_type VARCHAR(10)
) RETURNS TEXT AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_year INTEGER;
  v_month INTEGER;
  v_next_number INTEGER;
  v_result TEXT;
  v_type_code VARCHAR(3);
BEGIN
  -- Get company prefix
  SELECT prefix INTO v_prefix 
  FROM companies 
  WHERE id = p_company_id;
  
  -- Handle missing prefix
  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'Company prefix not set for company_id: %', p_company_id;
  END IF;
  
  -- Get current year and month
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_month := EXTRACT(MONTH FROM CURRENT_DATE);
  
  -- Set type code (INV/QUO)
  v_type_code := CASE WHEN p_type = 'invoice' THEN 'INV' ELSE 'QUO' END;
  
  -- Get next sequence number
  INSERT INTO invoice_sequences (company_id, year, month, type, last_number)
  VALUES (p_company_id, v_year, v_month, p_type, 1)
  ON CONFLICT (company_id, year, month, type)
  DO UPDATE SET last_number = invoice_sequences.last_number + 1
  RETURNING last_number INTO v_next_number;
  
  -- Format: PREFIX TYPE YEAR MONTH SEQUENCE (e.g., TCINV2025040001)
  -- Sequence is zero-padded to 4 digits but can grow beyond 9999
  v_result := CONCAT(
    v_prefix,
    v_type_code,
    TO_CHAR(v_year, 'FM0000'),  -- 4-digit year
    TO_CHAR(v_month, 'FM00'),     -- 2-digit month
    TO_CHAR(v_next_number, 'FM0000')  -- 4-digit sequence, auto-expands to 5+ digits
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get current sequence info for a company
CREATE OR REPLACE FUNCTION get_invoice_sequence_info(p_company_id UUID)
RETURNS TABLE(
  year INTEGER,
  month INTEGER,
  type VARCHAR(10),
  last_number INTEGER,
  next_number INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    year,
    month,
    type,
    last_number,
    last_number + 1 as next_number
  FROM invoice_sequences
  WHERE company_id = p_company_id
  ORDER BY year DESC, month DESC, type;
END;
$$ LANGUAGE plpgsql;

-- Sample data insertion for existing companies
-- Update existing companies with prefixes
UPDATE companies SET prefix = 'TC' WHERE name = 'TEXAS Crop';
UPDATE companies SET prefix = 'ABC' WHERE name = 'ABC Corporation';

-- If you want to set prefixes for all existing companies, you can use:
-- UPDATE companies SET prefix = UPPER(LEFT(name, 3)) WHERE prefix IS NULL;