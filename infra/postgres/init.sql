-- Database per Service: um único Postgres físico (para caber no notebook),
-- mas cada serviço tem seu próprio schema e seu próprio usuário.
-- Nenhum serviço tem permissão no schema do outro: não existe JOIN entre domínios.

CREATE USER station_user WITH PASSWORD 'station_pw';
CREATE USER reservation_user WITH PASSWORD 'reservation_pw';
CREATE USER billing_user WITH PASSWORD 'billing_pw';

CREATE SCHEMA station AUTHORIZATION station_user;
CREATE SCHEMA reservation AUTHORIZATION reservation_user;
CREATE SCHEMA billing AUTHORIZATION billing_user;

ALTER ROLE station_user SET search_path = station;
ALTER ROLE reservation_user SET search_path = reservation;
ALTER ROLE billing_user SET search_path = billing;

REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Keycloak usa um banco próprio
CREATE DATABASE keycloak;
