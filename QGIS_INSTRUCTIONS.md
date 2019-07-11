## Instructions for getting to QGIS to edit bus loop information

1. Find the microSD card (likely inside a microSD to SD card adapter) labeled **RPi QGIS**

2. Insert it into a Raspberry Pi (RPi) (preferably a RPi 3 Model B+)

3. Boot the RPi (have it connected to a monitor and keyboard)

4. Log in to the RPi (wait for the prompt to show) (username and password are provided on the SD card adapter's attached note)

5. Ensure the RPi is connected to the internet by entering the command `sudo raspi-config` go into **Networking Options** and then **Wi-fi** and enter the SSID (name) of the Wi-fi network to connect to. (typically this will be bloomu (without a password))

6. Ensure that SSH is enabled by entering the command `sudo raspi-config` go into **Interfacing Options** and then **SSH**

7. Without disconnecting the power, disconnect the RPi from the monitor and keyboard

8. Connect the RPi to a computer with a GUI via an ethernet cable (preferably running a Unix-like operating system)

9. In the terminal for the other computer, enter the command `ip a s` and search for an IP Address similar to 172.16.1.1 (if you find something like 172.16.1.10 and it doesn't work, try it without the ending 0)

10. With that IP Address, enter the command `ssh -Y pi@THAT_IP_ADDRESS`
IF THE RPI FAILS TO CONNECT VIA SSH, REFER TO THE [TROUBLESHOOTING GUIDE](#troubleshooting) AT THE BOTTOM OF THIS DOCUMENT

11. If the terminal prompts whether or not to trust the computer being ssh's into, please type `yes`

12. Log in to the RPi again with the same password as before

13. Enter the command `qgis`

14. Once complete using QGIS, turn off the RPi with the command `sudo poweroff`

<p align="center">OR</p>

15. Exit the ssh session with `exit` and then unplug the RPi

## Instructions for using QGIS to edit bus loop information

1. [Insert step one here]

2. [Insert step two here]

## Troubleshooting

### Did the ssh break again?
1. Disconnect the RPi from the other computer
2. Reconnect the RPi to the monitor and keyboard
3. From the pi user directory, (which is where logging in should automatically put you) do `cd ./Documents/bash_scripts`
4. Execute the networking script with the command `sudo bash ./001.install-networking.sh`
5. If it asks to edit anything, provide the answer `y` (or yes)
6. After that, keep the RPi powered and reattempt to [get to QGIS](#instructions-for-getting-to-qgis-to-edit-bus-loop-information)
