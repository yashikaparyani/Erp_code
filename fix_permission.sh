#!/bin/bash
cd /home/system/frappe-bench
DB_NAME="_05a8f56b5c1c5c14"
DB_PASS="6G8uPSkn7IwU9QA5"
mysql -u $DB_NAME -p"$DB_PASS" $DB_NAME -e "UPDATE tabDocPerm SET \`delete\`=1 WHERE parent='GE Tender' AND role='Guest';"
mysql -u $DB_NAME -p"$DB_PASS" $DB_NAME -e "UPDATE tabDocPerm SET \`delete\`=1 WHERE parent='GE Party' AND role='Guest';"
mysql -u $DB_NAME -p"$DB_PASS" $DB_NAME -e "UPDATE tabDocPerm SET \`delete\`=1 WHERE parent='GE EMD PBG Instrument' AND role='Guest';"
echo "Permissions updated!"
mysql -u $DB_NAME -p"$DB_PASS" $DB_NAME -e "SELECT parent, role, \`select\`, \`read\`, write, \`delete\` FROM tabDocPerm WHERE parent LIKE 'GE%';"
