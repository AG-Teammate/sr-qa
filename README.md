# SR QA Tool  
This tool runs a CSV file against MS TTS API and then back via STT to compare results  
# Installation
Make sure you have NodeJS 12+ and NPM installed  
Run npm install  
Copy .env.example to .env  
Edit .env and put MS API keys  
Copy input.csv.example to input.csv  
Run node script  
Check out output.csv. The last column should indicate PASS or FAIL  
