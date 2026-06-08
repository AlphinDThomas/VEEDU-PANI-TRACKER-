-- Drop existing tables if re-running
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS materials;
DROP TABLE IF EXISTS daily_records;

-- Create daily_records table
CREATE TABLE daily_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  labour_count INTEGER DEFAULT 0,
  labour_notes TEXT,
  tea_morning DECIMAL(10,2) DEFAULT 0,
  tea_evening DECIMAL(10,2) DEFAULT 0,
  site_notes TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create materials table
CREATE TABLE materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  daily_record_id UUID REFERENCES daily_records(id) ON DELETE CASCADE,
  material_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  invoice_number VARCHAR(255),
  supplier_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activities table
CREATE TABLE activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  daily_record_id UUID REFERENCES daily_records(id) ON DELETE CASCADE,
  activity_name VARCHAR(255) NOT NULL,
  area_location VARCHAR(255),
  tags TEXT[], -- array of text
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
