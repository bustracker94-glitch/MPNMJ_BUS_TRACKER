-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: stops
create table stops (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  latitude float not null,
  longitude float not null
);

-- Table: routes
create table routes (
  id uuid primary key default uuid_generate_v4(),
  name text not null
);

-- Table: route_stops
create table route_stops (
  route_id uuid references routes(id) on delete cascade,
  stop_id uuid references stops(id) on delete cascade,
  stop_order int not null,
  primary key (route_id, stop_id)
);

-- Table: buses
create table buses (
  id text primary key, -- Custom ID like 'BUS_01'
  route_id uuid references routes(id) on delete set null,
  active boolean default true
);

-- Table: bus_locations
create table bus_locations (
  bus_id text references buses(id) on delete cascade primary key, -- Only store latest location per bus
  latitude float not null,
  longitude float not null,
  speed int default 0,
  timestamp timestamptz default now()
);

-- Row Level Security (RLS) - Optional for prototype but good practice
alter table stops enable row level security;
alter table routes enable row level security;
alter table route_stops enable row level security;
alter table buses enable row level security;
alter table bus_locations enable row level security;

-- Public read access
create policy "Public read stops" on stops for select using (true);
create policy "Admin manage stops" on stops for all using (true);

create policy "Public read routes" on routes for select using (true);
create policy "Admin manage routes" on routes for all using (true);

create policy "Public read route_stops" on route_stops for select using (true);
create policy "Admin manage route_stops" on route_stops for all using (true);

create policy "Public read buses" on buses for select using (true);
create policy "Admin manage buses" on buses for all using (true);

create policy "Public read bus_locations" on bus_locations for select using (true);
create policy "Admin manage bus_locations" on bus_locations for all using (true);

-- Insert Dummy Data for Testing
insert into stops (name, latitude, longitude) values 
('College Main Gate', 11.342156, 77.728901),
('Chennimalai Bus Stand', 11.1667, 77.6000),
('Erode Bus Stand', 11.3410, 77.7172);

-- (Assuming UUIDs are generated, we can't hardcode them easily in SQL script without variables, 
-- but this is enough for the user to run in Supabase SQL editor)
