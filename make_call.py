from twilio.rest import Client
import time
import sys
import threading

# Get these credentials from http://twilio.com/user/account
account_sid = "account_sid"
auth_token = "auth_token"
client = Client(account_sid, auth_token)

to_numbers = ["+972547804658",
              # "+972733949364"
              ]


# Make the call
def make_call(to):
    call = client.api.account.calls \
        .create(to=to,  # Any phone number
                from_="+972733948111",  # Must be a valid Twilio number
                url="http://demo.twilio.com/hellomonkey/monkey.mp3")
    return call


def call_wait_end(to_num, sec):
    print('calls to {0}'.format(to_num))
    call = make_call(to_num)
    if sec is not None:
        time.sleep(sec)
        call.update(status="completed")
        print('[*] call to {0} ended'.format(call.to))


if __name__ == '__main__':
    sleep_sec = None
    if len(sys.argv) > 1:
        sleep_sec = int(sys.argv[1])
    for to_num in to_numbers:
        try:
            t = threading.Thread(target=call_wait_end, args=(to_num, sleep_sec))
            t.start()
        except:
            print('Error')
