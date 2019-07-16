## Instructions for getting to QGIS to edit bus loop information

1. Find the microSD card (likely inside a microSD to SD card adapter in the ACM room) labeled **RPi QGIS**

2. Insert it into a Raspberry Pi (RPi) (preferably a RPi 3 Model B+) and plug the RPi into a power source

3. Connect the RPi to a computer with a GUI via an ethernet cable (preferably running a Unix-like operating system)

4. After waiting a couple of minutes and in the terminal for the other computer, enter the command `ip a s` and search for an IP Address similar to 172.16.1.1 (if you find something like 172.16.1.10 and it doesn't work, try it without the ending 0)

5. With that IP Address, enter the command `ssh -Y pi@THAT_IP_ADDRESS`

6. If the terminal prompts whether or not to trust the computer being ssh's into, please type `yes`

7. Log in to the RPi again with the login information that is provided on the SD card adapter's attached note

<p align="center">IF THE RPi DOES NOT CONNECT PROPERLY OR DOES NOT GRANT PERMISSION AFTER ENTERING THE LOGIN INFORMATION, SEE THE <a href="#troubleshooting">TROUBLESHOOTING</a> SECTION</p>

8. Enter the command `qgis`

9. After QGIS starts up, if you want to continue to use the ssh session for RPi use the command `Ctrl+Z` (`Command+Z` on macOS) followed by `bg`

10. Once complete using QGIS, turn off the RPi with the command `sudo poweroff`

<p align="center">OR</p>

11. Exit the ssh session with `exit` and then unplug the RPi

12. Finally, put the microSD card back in the adapter and put it away

## Instructions for using QGIS to edit bus loop information

1. [Insert step one here]

2. [Insert step two here]

## Troubleshooting

### Did the ssh break again?
1. Connect the RPi to a monitor and keyboard
2. Log in to the RPi (wait for the prompt to show) (login information is provided on the SD card adapter's attached note)
3. Ensure the RPi is connected to the internet by entering the command `sudo raspi-config` go into **Networking Options** and then **Wi-fi** and enter the SSID (name) of the Wi-fi network to connect to. (typically this will be bloomu (without a password))
4. Ensure that SSH is enabled by entering the command `sudo raspi-config` go into **Interfacing Options** and then **SSH**
5. From the pi user directory, (which is where logging in should automatically put you) do `cd ./Documents/bash_scripts`
6. Execute the networking script with the command `sudo bash ./001.install-networking.sh`
7. If it asks to edit anything, provide the answer `y` (or yes)
8. Without disconnecting the power, disconnect the RPi from the monitor and keyboard
9. Reconnect the RPi to the other computer and continue with the [guide on how to get to QGIS](#instructions-for-getting-to-qgis-to-edit-bus-loop-information)
