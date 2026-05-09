-- Test script to demonstrate sequence overflow handling
-- This shows how the numbering system handles sequences beyond 9999

-- Test 1: Normal sequence (1-9999)
SELECT generate_invoice_number('company_uuid_here', 'invoice') as normal_sequence;

-- Test 2: Simulate high sequence numbers
-- Manually set a high sequence number to test overflow
INSERT INTO invoice_sequences (company_id, year, month, type, last_number) 
VALUES ('company_uuid_here', 2025, 4, 'invoice', 9999)
ON CONFLICT (company_id, year, month, type)
DO UPDATE SET last_number = 9999;

-- This should generate TCINV20250410000 (5 digits)
SELECT generate_invoice_number('company_uuid_here', 'invoice') as overflow_sequence;

-- Test 3: Even higher sequence
UPDATE invoice_sequences 
SET last_number = 99999 
WHERE company_id = 'company_uuid_here' 
AND year = 2025 
AND month = 4 
AND type = 'invoice';

-- This should generate TCINV202504100000 (6 digits)
SELECT generate_invoice_number('company_uuid_here', 'invoice') as high_overflow_sequence;

-- Query to show current sequence info
SELECT * FROM get_invoice_sequence_info('company_uuid_here');

-- Cleanup test data (optional)
-- DELETE FROM invoice_sequences WHERE company_id = 'company_uuid_here';