#!/bin/zsh
# side-by-side: ours (left) vs real screenshot (right), both 412 wide, saved to ui_shots/compare_*.png
cd "$(dirname $0)/../ui_shots"; R=../../real_screens
pair() { magick \( after/$1.png -crop 412x915+0+0 +repage \) \( $2 -crop $3 +repage -resize 412x -crop 412x915+0+0 +repage \) -background white -gravity north -splice 0x0 +append compare_$1.png; }
I=$R/udit_phone2/IMG_
pair home $R/01_home.png 1080x2392+0+120
pair history ${I}0891.PNG 1170x2532+0+135
pair txn ${I}0892.PNG 1170x2532+0+135
pair pay ${I}0893.PNG 1170x2532+0+135
pair payamt ${I}0896.PNG 1170x2532+0+135
pair score ${I}0897.PNG 1170x2532+0+135
pair bus ${I}0898.PNG 1170x2532+0+135
pair bus_load ${I}0899.PNG 1170x2532+0+135
pair bus_res ${I}0900.PNG 1170x2532+0+135
pair help ${I}0901.PNG 1170x2532+0+135
pair loan_rej $R/04_loan.png 1080x2392+0+120
