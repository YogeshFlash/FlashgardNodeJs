/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.content.Context
 *  android.graphics.Point
 *  android.os.AsyncTask
 *  android.os.Handler
 *  android.util.Log
 */
package com.inuker.bluetooth.library.cc;

import android.content.Context;
import android.graphics.Point;
import android.os.AsyncTask;
import android.os.Handler;
import android.util.Log;
import com.inuker.bluetooth.library.c.c;
import com.inuker.bluetooth.library.cc.Arrays;
import com.inuker.bluetooth.library.cc.IBleCutProgressCallBack;
import com.inuker.bluetooth.library.cc.IBleDefaultResultCallBack;
import com.inuker.bluetooth.library.cc.IBleValueResultCallBack;
import com.inuker.bluetooth.library.cc.IBluetoothConnector;
import com.inuker.bluetooth.library.cc.IBluetoothSDK;
import com.inuker.bluetooth.library.cc.d;
import com.inuker.bluetooth.library.cc.e;
import com.inuker.bluetooth.library.cc.listener.IBluetoothConnectListener;
import com.inuker.bluetooth.library.cc.listener.IBluetoothSearchListener;
import com.inuker.bluetooth.library.connect.a.a;
import com.inuker.bluetooth.library.connect.c.j;
import com.inuker.bluetooth.library.connect.listener.BluetoothStateListener;
import com.inuker.bluetooth.library.search.SearchResult;
import com.inuker.bluetooth.library.search.c.b;
import com.inuker.bluetooth.library.search.g;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class BluetoothSDK
implements IBluetoothSDK {
    private static BluetoothSDK b;
    private com.inuker.bluetooth.library.a c;
    private Context d;
    private String e = "";
    private static byte[] f;
    public static final UUID UUID_SERVICE;
    public static final UUID UUID_NOTIFY_DATA_RECEIVE;
    public static final UUID UUID_WRITE_DATA_RECEIVE;
    private String g;
    private String h;
    private List<SearchResult> i;
    private IBluetoothConnectListener j;
    private IBleValueResultCallBack<Integer> k;
    private List<String> l;
    private int m;
    private IBleCutProgressCallBack n;
    private List<IBluetoothConnector> o = new ArrayList<IBluetoothConnector>();
    private IBleValueResultCallBack p;
    private IBleDefaultResultCallBack q;
    private String r;
    private com.inuker.bluetooth.library.connect.c.d s = new com.inuker.bluetooth.library.connect.c.d(){

        @Override
        public void a(UUID uUID, UUID uUID2, byte[] byArray) {
            byte[] byArray2;
            Log.e((String)"BleNotifyResponse", (String)Arrays.byteArrayToHexStr(byArray));
            String string = null;
            if (byArray[0] == 90 && byArray[1] == -91 && byArray[byArray.length - 1] == 10 && byArray[byArray.length - 2] == 13) {
                BluetoothSDK.this.r = null;
                string = Arrays.byteArrayToHexStr(byArray);
            } else {
                if (BluetoothSDK.this.r == null) {
                    BluetoothSDK.this.r = Arrays.byteArrayToHexStr(byArray);
                    return;
                }
                BluetoothSDK.this.r = BluetoothSDK.this.r + Arrays.byteArrayToHexStr(byArray);
                byArray2 = Arrays.hexStrToByteArray(BluetoothSDK.this.r);
                if (byArray2[0] == 90 && byArray2[1] == -91 && byArray2[byArray2.length - 1] == 10 && byArray2[byArray2.length - 2] == 13) {
                    string = BluetoothSDK.this.r;
                    BluetoothSDK.this.r = null;
                } else {
                    return;
                }
            }
            byArray2 = Arrays.hexStrToByteArray(string);
            if ((byArray2[2] & 0xFF) == 170) {
                switch (byArray2[4] & 0xFF) {
                    case 16: 
                    case 17: 
                    case 25: 
                    case 40: {
                        BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.y);
                        if (BluetoothSDK.this.t.substring(BluetoothSDK.this.t.length() - 1, BluetoothSDK.this.t.length()).equals("C")) {
                            if (BluetoothSDK.this.a(byArray2)) {
                                if (byArray2[8] == 0) {
                                    if (BluetoothSDK.this.p == null) break;
                                    BluetoothSDK.this.p.onSuccessful(((byArray2[10] & 0xFF) << 8) + (byArray2[9] & 0xFF));
                                    BluetoothSDK.this.p = null;
                                    break;
                                }
                                if (BluetoothSDK.this.p == null) break;
                                BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.a(byArray2, byArray2.length)) {
                            if (byArray2[8] == 0) {
                                if (BluetoothSDK.this.p == null) break;
                                BluetoothSDK.this.p.onSuccessful(((byArray2[10] & 0xFF) << 8) + (byArray2[9] & 0xFF));
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.p == null) break;
                        BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                        BluetoothSDK.this.p = null;
                        break;
                    }
                    case 18: {
                        BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.y);
                        if (BluetoothSDK.this.t.substring(BluetoothSDK.this.t.length() - 1, BluetoothSDK.this.t.length()).equals("C")) {
                            if (BluetoothSDK.this.a(byArray2)) {
                                if (byArray2[8] == 0) {
                                    if (BluetoothSDK.this.p == null) break;
                                    BluetoothSDK.this.p.onSuccessful(new Point(((byArray2[10] & 0xFF) << 8) + (byArray2[9] & 0xFF), ((byArray2[12] & 0xFF) << 8) + (byArray2[11] & 0xFF)));
                                    BluetoothSDK.this.p = null;
                                    break;
                                }
                                if (BluetoothSDK.this.p == null) break;
                                BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.a(byArray2, byArray2.length)) {
                            if (byArray2[8] == 0) {
                                if (BluetoothSDK.this.p == null) break;
                                BluetoothSDK.this.p.onSuccessful(new Point(((byArray2[10] & 0xFF) << 8) + (byArray2[9] & 0xFF), ((byArray2[12] & 0xFF) << 8) + (byArray2[11] & 0xFF)));
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.p == null) break;
                        BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                        BluetoothSDK.this.p = null;
                        break;
                    }
                    case 24: 
                    case 34: {
                        BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.y);
                        if (BluetoothSDK.this.t.substring(BluetoothSDK.this.t.length() - 1, BluetoothSDK.this.t.length()).equals("C")) {
                            if (BluetoothSDK.this.a(byArray2)) {
                                if (byArray2[8] == 0) {
                                    if (BluetoothSDK.this.p == null) break;
                                    BluetoothSDK.this.p.onSuccessful((byArray2[9] & 0xFF) != 0);
                                    BluetoothSDK.this.p = null;
                                    break;
                                }
                                if (BluetoothSDK.this.p == null) break;
                                BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.a(byArray2, byArray2.length)) {
                            if (byArray2[8] == 0) {
                                if (BluetoothSDK.this.p == null) break;
                                BluetoothSDK.this.p.onSuccessful((byArray2[9] & 0xFF) != 0);
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.p == null) break;
                        BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                        BluetoothSDK.this.p = null;
                        break;
                    }
                    case 19: {
                        BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.y);
                        if (BluetoothSDK.this.t.substring(BluetoothSDK.this.t.length() - 1, BluetoothSDK.this.t.length()).equals("C")) {
                            if (BluetoothSDK.this.a(byArray2)) {
                                if (byArray2[8] == 0) {
                                    if (BluetoothSDK.this.p == null) break;
                                    byte[] byArray3 = new byte[]{byArray2[9], byArray2[10], byArray2[11], byArray2[12], byArray2[13], byArray2[14], byArray2[15], byArray2[16], byArray2[17], byArray2[18], byArray2[19], byArray2[20]};
                                    BluetoothSDK.this.p.onSuccessful(Arrays.byteArrayToHexStr(byArray3).replace("\u0000", ""));
                                    BluetoothSDK.this.p = null;
                                    break;
                                }
                                if (BluetoothSDK.this.p == null) break;
                                BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.a(byArray2, byArray2.length)) {
                            if (byArray2[8] == 0) {
                                if (BluetoothSDK.this.p == null) break;
                                byte[] byArray4 = new byte[]{byArray2[9], byArray2[10], byArray2[11], byArray2[12], byArray2[13], byArray2[14], byArray2[15], byArray2[16], byArray2[17], byArray2[18], byArray2[19], byArray2[20]};
                                BluetoothSDK.this.p.onSuccessful(Arrays.byteArrayToHexStr(byArray4).replace("\u0000", ""));
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.p == null) break;
                        BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                        BluetoothSDK.this.p = null;
                        break;
                    }
                    case 33: {
                        BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.y);
                        if (BluetoothSDK.this.e.equals("hsznqmji")) {
                            if (BluetoothSDK.this.a(byArray2)) {
                                if (byArray2[8] == 0) {
                                    if (BluetoothSDK.this.p == null) break;
                                    byte[] byArray5 = new byte[byArray2.length - 9 - 5];
                                    for (int i2 = 9; i2 < byArray2.length - 5; ++i2) {
                                        byArray5[i2 - 9] = byArray2[i2];
                                    }
                                    BluetoothSDK.this.p.onSuccessful(Arrays.stringByAsciiByte(byArray5).replace("\u0000", ""));
                                    BluetoothSDK.this.p = null;
                                    break;
                                }
                                if (BluetoothSDK.this.p == null) break;
                                BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.a(byArray2, byArray2.length)) {
                            if (byArray2[8] == 0) {
                                if (BluetoothSDK.this.p == null) break;
                                byte[] byArray6 = new byte[byArray2.length - 9 - 4];
                                for (int i3 = 9; i3 < byArray2.length - 4; ++i3) {
                                    byArray6[i3 - 9] = byArray2[i3];
                                }
                                BluetoothSDK.this.p.onSuccessful(Arrays.stringByAsciiByte(byArray6).replace("\u0000", ""));
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.p == null) break;
                        BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                        BluetoothSDK.this.p = null;
                        break;
                    }
                    case 32: {
                        BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.y);
                        if (BluetoothSDK.this.t.substring(BluetoothSDK.this.t.length() - 1, BluetoothSDK.this.t.length()).equals("C")) {
                            if (byArray2[8] == 0) {
                                if (BluetoothSDK.this.k == null) break;
                                BluetoothSDK.this.k.onSuccessful(byArray2[7] & 0xFF);
                                BluetoothSDK.this.k = null;
                                break;
                            }
                            if (BluetoothSDK.this.k == null) break;
                            BluetoothSDK.this.k.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.k = null;
                            break;
                        }
                        if (byArray2[8] == 0) {
                            if (BluetoothSDK.this.k == null) break;
                            BluetoothSDK.this.k.onSuccessful(byArray2[7] & 0xFF);
                            BluetoothSDK.this.k = null;
                            break;
                        }
                        if (BluetoothSDK.this.k == null) break;
                        BluetoothSDK.this.k.onError(byArray2[8] & 0xFF);
                        BluetoothSDK.this.k = null;
                        break;
                    }
                    case 37: {
                        BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.y);
                        if (BluetoothSDK.this.t.substring(BluetoothSDK.this.t.length() - 1, BluetoothSDK.this.t.length()).equals("C")) {
                            if (byArray2[8] == 0) {
                                if (BluetoothSDK.this.p == null) break;
                                float f2 = (float)((byArray2[9] & 0xFF) + ((byArray2[10] & 0xFF) << 8) + ((byArray2[11] & 0xFF) << 16) + ((byArray2[12] & 0xFF) << 24)) / 100.0f;
                                float f3 = (float)((byArray2[13] & 0xFF) + ((byArray2[14] & 0xFF) << 8) + ((byArray2[15] & 0xFF) << 16) + ((byArray2[16] & 0xFF) << 24)) / 100.0f;
                                BluetoothSDK.this.p.onSuccessful(new Point((int)f2, (int)f3));
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (byArray2[8] == 0) {
                            if (BluetoothSDK.this.p == null) break;
                            float f4 = (float)((byArray2[9] & 0xFF) + ((byArray2[10] & 0xFF) << 8) + ((byArray2[11] & 0xFF) << 16) + ((byArray2[12] & 0xFF) << 24)) / 100.0f;
                            float f5 = (float)((byArray2[13] & 0xFF) + ((byArray2[14] & 0xFF) << 8) + ((byArray2[15] & 0xFF) << 16) + ((byArray2[16] & 0xFF) << 24)) / 100.0f;
                            BluetoothSDK.this.p.onSuccessful(new Point((int)f4, (int)f5));
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.p == null) break;
                        BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                        BluetoothSDK.this.p = null;
                        break;
                    }
                    case 41: 
                    case 47: {
                        BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.y);
                        if (BluetoothSDK.this.t.substring(BluetoothSDK.this.t.length() - 1, BluetoothSDK.this.t.length()).equals("C")) {
                            if (BluetoothSDK.this.a(byArray2)) {
                                if (byArray2[8] == 0) {
                                    if (BluetoothSDK.this.p == null) break;
                                    int n2 = (byArray2[9] & 0xFF) + ((byArray2[10] & 0xFF) << 8);
                                    int n3 = (byArray2[11] & 0xFF) + ((byArray2[12] & 0xFF) << 8);
                                    BluetoothSDK.this.p.onSuccessful(new Point(n2, n3));
                                    BluetoothSDK.this.p = null;
                                    break;
                                }
                                if (BluetoothSDK.this.p == null) break;
                                BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.a(byArray2, byArray2.length)) {
                            if (byArray2[8] == 0) {
                                if (BluetoothSDK.this.p == null) break;
                                int n4 = (byArray2[9] & 0xFF) + ((byArray2[10] & 0xFF) << 8);
                                int n5 = (byArray2[11] & 0xFF) + ((byArray2[12] & 0xFF) << 8);
                                BluetoothSDK.this.p.onSuccessful(new Point(n4, n5));
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.p == null) break;
                        BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                        BluetoothSDK.this.p = null;
                        break;
                    }
                    case 50: 
                    case 51: {
                        BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.y);
                        if (BluetoothSDK.this.t.substring(BluetoothSDK.this.t.length() - 1, BluetoothSDK.this.t.length()).equals("C")) {
                            if (BluetoothSDK.this.a(byArray2)) {
                                if (byArray2[8] == 0) {
                                    if (BluetoothSDK.this.p == null) break;
                                    BluetoothSDK.this.p.onSuccessful(byArray2[9] & 0xFF);
                                    BluetoothSDK.this.p = null;
                                    break;
                                }
                                if (BluetoothSDK.this.p == null) break;
                                BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.a(byArray2, byArray2.length)) {
                            if (byArray2[8] == 0) {
                                if (BluetoothSDK.this.p == null) break;
                                BluetoothSDK.this.p.onSuccessful(byArray2[9] & 0xFF);
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.p == null) break;
                        BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                        BluetoothSDK.this.p = null;
                        break;
                    }
                    case 44: {
                        BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.y);
                        if (byArray2[8] == 0) {
                            if (BluetoothSDK.this.p == null) break;
                            int n6 = byArray2[5] & 0xFF | byArray2[6] << 8 & 0xFF00;
                            byte[] byArray7 = new byte[n6];
                            for (int i4 = 9; i4 < 9 + n6; ++i4) {
                                byArray7[i4 - 9] = byArray2[i4];
                            }
                            String string2 = null;
                            try {
                                string2 = new String(byArray7, "UTF-8");
                            }
                            catch (UnsupportedEncodingException unsupportedEncodingException) {
                                unsupportedEncodingException.printStackTrace();
                            }
                            Log.e((String)"0x2C------", (String)string2);
                            String[] stringArray = string2.replace("\ufffd", "").replace("\r", "").split(".PLT");
                            BluetoothSDK.this.p.onSuccessful(java.util.Arrays.asList(stringArray));
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.p == null) break;
                        BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                        BluetoothSDK.this.p = null;
                        break;
                    }
                    case 52: {
                        BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.y);
                        if (BluetoothSDK.this.t.substring(BluetoothSDK.this.t.length() - 1, BluetoothSDK.this.t.length()).equals("C")) {
                            if (BluetoothSDK.this.a(byArray2)) {
                                if (byArray2[8] == 0) {
                                    if (BluetoothSDK.this.p == null) break;
                                    int n7 = (byArray2[10] << 8) + (byArray2[9] & 0xFF);
                                    BluetoothSDK.this.p.onSuccessful(n7);
                                    BluetoothSDK.this.p = null;
                                    break;
                                }
                                if (BluetoothSDK.this.p == null) break;
                                BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.a(byArray2, byArray2.length)) {
                            if (byArray2[8] == 0) {
                                if (BluetoothSDK.this.p == null) break;
                                int n8 = (byArray2[10] << 8) + (byArray2[9] & 0xFF);
                                BluetoothSDK.this.p.onSuccessful(n8);
                                BluetoothSDK.this.p = null;
                                break;
                            }
                            if (BluetoothSDK.this.p == null) break;
                            BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.p = null;
                            break;
                        }
                        if (BluetoothSDK.this.p == null) break;
                        BluetoothSDK.this.p.onError(byArray2[8] & 0xFF);
                        BluetoothSDK.this.p = null;
                    }
                }
            } else if ((byArray2[2] & 0xFF) == 187) {
                switch (byArray2[4] & 0xFF) {
                    case 16: 
                    case 17: 
                    case 18: 
                    case 22: 
                    case 23: 
                    case 24: 
                    case 25: 
                    case 27: 
                    case 34: 
                    case 35: 
                    case 36: 
                    case 37: 
                    case 38: 
                    case 39: 
                    case 40: 
                    case 41: 
                    case 42: 
                    case 43: 
                    case 46: 
                    case 52: {
                        BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.z);
                        if (BluetoothSDK.this.t.substring(BluetoothSDK.this.t.length() - 1, BluetoothSDK.this.t.length()).equals("C")) {
                            if (BluetoothSDK.this.a(byArray2)) {
                                if (byArray2[8] == 0) {
                                    if (BluetoothSDK.this.q == null) break;
                                    BluetoothSDK.this.q.onSuccessful();
                                    BluetoothSDK.this.q = null;
                                    break;
                                }
                                if (BluetoothSDK.this.q == null) break;
                                BluetoothSDK.this.q.onError(byArray2[8] & 0xFF);
                                BluetoothSDK.this.q = null;
                                break;
                            }
                            if (BluetoothSDK.this.q == null) break;
                            BluetoothSDK.this.q.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.q = null;
                            break;
                        }
                        if (BluetoothSDK.this.a(byArray2, byArray2.length)) {
                            if (byArray2[8] == 0) {
                                if (BluetoothSDK.this.q == null) break;
                                BluetoothSDK.this.q.onSuccessful();
                                BluetoothSDK.this.q = null;
                                break;
                            }
                            if (BluetoothSDK.this.q == null) break;
                            BluetoothSDK.this.q.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.q = null;
                            break;
                        }
                        if (BluetoothSDK.this.q == null) break;
                        BluetoothSDK.this.q.onError(byArray2[8] & 0xFF);
                        BluetoothSDK.this.q = null;
                    }
                }
            } else if ((byArray2[2] & 0xFF) == 204) {
                switch (byArray2[4] & 0xFF) {
                    case 48: {
                        BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.A);
                        if (byArray2[8] == 0) {
                            BluetoothSDK.this.m++;
                            if (BluetoothSDK.this.m == BluetoothSDK.this.l.size()) {
                                if (BluetoothSDK.this.n == null) break;
                                BluetoothSDK.this.n.onSuccess();
                                BluetoothSDK.this.n = null;
                                break;
                            }
                            if (BluetoothSDK.this.n != null) {
                                BluetoothSDK.this.n.onProgress((BluetoothSDK.this.m + 1) * 100 / BluetoothSDK.this.l.size());
                                BluetoothSDK.this.b((String)BluetoothSDK.this.l.get(BluetoothSDK.this.m));
                                break;
                            }
                            if (BluetoothSDK.this.n == null) break;
                            BluetoothSDK.this.n.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.n = null;
                            break;
                        }
                        if (byArray2[8] == 5) {
                            new Thread(new Runnable(){

                                @Override
                                public void run() {
                                    try {
                                        Thread.sleep(1500L);
                                        BluetoothSDK.this.b((String)BluetoothSDK.this.l.get(BluetoothSDK.this.m));
                                    }
                                    catch (InterruptedException interruptedException) {
                                        interruptedException.printStackTrace();
                                    }
                                }
                            }).start();
                            break;
                        }
                        if (BluetoothSDK.this.n == null) break;
                        BluetoothSDK.this.n.onError(byArray2[8] & 0xFF);
                        BluetoothSDK.this.n = null;
                        break;
                    }
                    case 64: 
                    case 65: {
                        BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.z);
                        if (BluetoothSDK.this.t.substring(BluetoothSDK.this.t.length() - 1, BluetoothSDK.this.t.length()).equals("C")) {
                            if (BluetoothSDK.this.a(byArray2)) {
                                if (byArray2[8] == 0) {
                                    if (BluetoothSDK.this.q == null) break;
                                    BluetoothSDK.this.q.onSuccessful();
                                    BluetoothSDK.this.q = null;
                                    break;
                                }
                                if (BluetoothSDK.this.q == null) break;
                                BluetoothSDK.this.q.onError(byArray2[8] & 0xFF);
                                BluetoothSDK.this.q = null;
                                break;
                            }
                            if (BluetoothSDK.this.q == null) break;
                            BluetoothSDK.this.q.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.q = null;
                            break;
                        }
                        if (BluetoothSDK.this.a(byArray2, byArray2.length)) {
                            if (byArray2[8] == 0) {
                                if (BluetoothSDK.this.q == null) break;
                                BluetoothSDK.this.q.onSuccessful();
                                BluetoothSDK.this.q = null;
                                break;
                            }
                            if (BluetoothSDK.this.q == null) break;
                            BluetoothSDK.this.q.onError(byArray2[8] & 0xFF);
                            BluetoothSDK.this.q = null;
                            break;
                        }
                        if (BluetoothSDK.this.q == null) break;
                        BluetoothSDK.this.q.onError(byArray2[8] & 0xFF);
                        BluetoothSDK.this.q = null;
                    }
                }
            }
        }

        @Override
        public void a(int n2) {
            if (n2 == 0) {
                String string = null;
                string = BluetoothSDK.this.e.equals("hsznqmji") ? "5AA5AA00210000" + Arrays.byteArrayToHexStr(BluetoothSDK.this.a(new int[]{170, 0, 33, 0, 0})) + "0D0A" : "5AA5AA00210000CB0D0A";
                BluetoothSDK.this.a(string, new IBleValueResultCallBack<String>(){

                    public void a(String string) {
                        BluetoothSDK.this.t = string.substring(4);
                        if (BluetoothSDK.this.j != null) {
                            BluetoothSDK.this.j.onConnected(BluetoothSDK.this.g, string);
                            BluetoothSDK.this.j = null;
                        }
                        for (IBluetoothConnector iBluetoothConnector : BluetoothSDK.this.o) {
                            iBluetoothConnector.onConnected();
                        }
                        BluetoothSDK.this.c.a(BluetoothSDK.this.g, BluetoothSDK.this.u);
                        BluetoothSDK.this.x = true;
                        BluetoothSDK.this.w = false;
                    }

                    @Override
                    public void onError(String string) {
                        if (BluetoothSDK.this.j != null) {
                            BluetoothSDK.this.j.onError(string);
                            BluetoothSDK.this.j = null;
                        }
                        BluetoothSDK.this.c.a(BluetoothSDK.this.g);
                        BluetoothSDK.this.x = false;
                        BluetoothSDK.this.w = false;
                    }

                    @Override
                    public void onError(int n2) {
                        if (BluetoothSDK.this.j != null) {
                            BluetoothSDK.this.j.onError(n2);
                            BluetoothSDK.this.j = null;
                        }
                        BluetoothSDK.this.c.a(BluetoothSDK.this.g);
                        BluetoothSDK.this.x = false;
                        BluetoothSDK.this.w = false;
                    }

                    @Override
                    public /* synthetic */ void onSuccessful(Object object) {
                        this.a((String)object);
                    }
                });
            } else {
                if (BluetoothSDK.this.j != null) {
                    BluetoothSDK.this.j.onError(26);
                    BluetoothSDK.this.j = null;
                }
                BluetoothSDK.this.c.a(BluetoothSDK.this.g);
                BluetoothSDK.this.x = false;
                BluetoothSDK.this.w = false;
            }
        }
    };
    private String t = null;
    private com.inuker.bluetooth.library.connect.listener.a u = new com.inuker.bluetooth.library.connect.listener.a(){

        @Override
        public void a(String string, int n2) {
            switch (n2) {
                case 16: {
                    break;
                }
                case 32: {
                    BluetoothSDK.this.x = false;
                    BluetoothSDK.this.w = false;
                    for (IBluetoothConnector iBluetoothConnector : BluetoothSDK.this.o) {
                        iBluetoothConnector.onDisconnected();
                    }
                    BluetoothSDK.this.c.b(BluetoothSDK.this.g, BluetoothSDK.this.u);
                    BluetoothSDK.this.t = null;
                    break;
                }
            }
        }
    };
    private a v;
    private boolean w = false;
    private boolean x = false;
    Handler a = new Handler();
    private Runnable y = new Runnable(){

        @Override
        public void run() {
            if (BluetoothSDK.this.p != null) {
                BluetoothSDK.this.p.onError(23);
                BluetoothSDK.this.p = null;
            }
        }
    };
    private Runnable z = new Runnable(){

        @Override
        public void run() {
            if (BluetoothSDK.this.q != null) {
                BluetoothSDK.this.q.onError(23);
                BluetoothSDK.this.q = null;
            }
        }
    };
    private Runnable A = new Runnable(){

        @Override
        public void run() {
            if (BluetoothSDK.this.n != null) {
                BluetoothSDK.this.n.onError(23);
                BluetoothSDK.this.n = null;
            }
        }
    };

    public static synchronized BluetoothSDK init(Context context, String string) {
        if (b == null) {
            b = new BluetoothSDK(context, string);
        }
        return b;
    }

    public static synchronized BluetoothSDK getInstance() {
        return b;
    }

    public BluetoothSDK(Context context, String string) {
        this.e = string;
        try {
            f = string.getBytes("US-ASCII");
        }
        catch (UnsupportedEncodingException unsupportedEncodingException) {
            unsupportedEncodingException.printStackTrace();
        }
        this.d = context;
        this.c = new com.inuker.bluetooth.library.a(context);
    }

    @Override
    public void search(int n2, final IBluetoothSearchListener iBluetoothSearchListener) {
        if (!this.c.b()) {
            iBluetoothSearchListener.onError(21);
            return;
        }
        this.i = new ArrayList<SearchResult>();
        this.c.a(new g.a().b(n2).a(), new b(){

            @Override
            public void a() {
            }

            @Override
            public void a(SearchResult searchResult) {
                if (searchResult.getName() == null || searchResult.getName().isEmpty()) {
                    return;
                }
                if (searchResult.getName().contains("FilmCut_")) {
                    if (BluetoothSDK.this.i.contains(searchResult)) {
                        return;
                    }
                    BluetoothSDK.this.i.add(searchResult);
                    iBluetoothSearchListener.onDeviceFounded(searchResult);
                }
            }

            @Override
            public void b() {
                iBluetoothSearchListener.onComplete();
            }

            @Override
            public void c() {
            }
        });
    }

    @Override
    public void stopSearch() {
        this.c.a();
    }

    @Override
    public void connect(final SearchResult searchResult, IBluetoothConnectListener iBluetoothConnectListener) {
        if (!this.c.b()) {
            this.j.onError(21);
            return;
        }
        this.j = iBluetoothConnectListener;
        this.g = searchResult.getAddress();
        this.c.a(this.g, new a.a().a(1).c(5000).b(1).d(5000).a(), new com.inuker.bluetooth.library.connect.c.a(){

            @Override
            public void a(int n2, c c2) {
                if (n2 == 0) {
                    BluetoothSDK.this.a(searchResult.getAddress());
                } else if (BluetoothSDK.this.j != null) {
                    BluetoothSDK.this.j.onError(22);
                    BluetoothSDK.this.j = null;
                }
            }
        });
    }

    @Override
    public void connect(String string, IBluetoothConnectListener iBluetoothConnectListener) {
        if (!this.c.b()) {
            this.j.onError(21);
            return;
        }
        this.j = iBluetoothConnectListener;
        this.g = string;
        this.c.a(this.g, new a.a().a(1).c(5000).b(1).d(5000).a(), new com.inuker.bluetooth.library.connect.c.a(){

            @Override
            public void a(int n2, c c2) {
                if (n2 == 0) {
                    BluetoothSDK.this.a(BluetoothSDK.this.g);
                } else if (BluetoothSDK.this.j != null) {
                    BluetoothSDK.this.j.onError(22);
                    BluetoothSDK.this.j = null;
                }
            }
        });
    }

    private void a(final String string) {
        this.c.a(string, 512, new com.inuker.bluetooth.library.connect.c.c(){

            @Override
            public void a(int n2, Integer n3) {
                if (n2 == 0) {
                    BluetoothSDK.this.c.a(string, UUID_SERVICE, UUID_NOTIFY_DATA_RECEIVE, BluetoothSDK.this.s);
                } else if (BluetoothSDK.this.j != null) {
                    BluetoothSDK.this.j.onError(25);
                    BluetoothSDK.this.j = null;
                    BluetoothSDK.this.c.a(string);
                    BluetoothSDK.this.w = false;
                    BluetoothSDK.this.x = false;
                }
            }
        });
    }

    @Override
    public void queryMachineCode(IBleValueResultCallBack<String> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA00130000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 19, 0, 0})) + "0D0A" : "5AA5AA00130000BD0D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void queryMachinePressure(IBleValueResultCallBack<Integer> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA00110000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 17, 0, 0})) + "0D0A" : "5AA5AA00110000BB0D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void queryMachineSpeed(IBleValueResultCallBack<Integer> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA00100000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 16, 0, 0})) + "0D0A" : "5AA5AA00100000BA0D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void queryMachineWide(IBleValueResultCallBack<Integer> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA00190000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 25, 0, 0})) + "0D0A" : "5AA5AA00190000C30D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void queryMachineGear(IBleValueResultCallBack<Point> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA00120000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 18, 0, 0})) + "0D0A" : "5AA5AA00120000BC0D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void queryMachineLimit(IBleValueResultCallBack<Boolean> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA00180000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 24, 0, 0})) + "0D0A" : "5AA5AA00180000C20D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void queryMachineVersion(IBleValueResultCallBack<String> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.e.equals("hsznqmji") ? "5AA5AA00210000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 33, 0, 0})) + "0D0A" : "5AA5AA00210000CB0D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void queryMachineStatus(final IBleValueResultCallBack<Integer> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA00200000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 32, 0, 0})) + "0D0A" : "5AA5AA00200000CA0D0A";
        if (this.g == null) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        if (this.c.b(this.g) != 2) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        this.c.b(this.g, UUID_SERVICE, UUID_WRITE_DATA_RECEIVE, Arrays.hexStrToByteArray(string), new j(){

            @Override
            public void a(int n2) {
                if (n2 == 0) {
                    BluetoothSDK.this.k = iBleValueResultCallBack;
                    BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.y);
                    BluetoothSDK.this.a.postDelayed(BluetoothSDK.this.y, 5000L);
                } else {
                    BluetoothSDK.this.k.onError(24);
                }
            }
        });
    }

    @Override
    public void queryMachineAutoPager(IBleValueResultCallBack<Boolean> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA00220000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 34, 0, 0})) + "0D0A" : "5AA5AA00220000" + String.format("%02x", 204) + "0D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void queryMachineAutoSpace(IBleValueResultCallBack<Integer> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA00340000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 52, 0, 0})) + "0D0A" : "5AA5AA00340000" + String.format("%02x", 222) + "0D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void setMachinePressure(int n2, IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB00110200" + String.format("%02x", n2 & 0xFF) + String.format("%02x", n2 >> 8 & 0xFF) + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 17, 2, 0, n2 & 0xFF, n2 >> 8 & 0xFF})) + "0D0A" : "5AA5BB00110200" + String.format("%02x", n2 & 0xFF) + String.format("%02x", n2 >> 8 & 0xFF) + String.format("%02x", 206 + (n2 & 0xFF) + (n2 >> 8 & 0xFF) & 0xFF) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void setMachineSpeed(int n2, IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB00100200" + String.format("%02x", n2 & 0xFF) + String.format("%02x", n2 >> 8 & 0xFF) + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 16, 2, 0, n2 & 0xFF, n2 >> 8 & 0xFF})) + "0D0A" : "5AA5BB00100200" + String.format("%02x", n2 & 0xFF) + String.format("%02x", n2 >> 8 & 0xFF) + String.format("%02x", 205 + (n2 & 0xFF) + (n2 >> 8 & 0xFF) & 0xFF) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void setMachineWide(int n2, IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB00190200" + String.format("%02x", n2 & 0xFF) + String.format("%02x", n2 >> 8 & 0xFF) + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 25, 2, 0, n2 & 0xFF, n2 >> 8 & 0xFF})) + "0D0A" : "5AA5BB00190200" + String.format("%02x", n2 & 0xFF) + String.format("%02x", n2 >> 8 & 0xFF) + String.format("%02x", 214 + (n2 & 0xFF) + (n2 >> 8 & 0xFF) & 0xFF) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void setMachineGear(Point point, IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB00120400" + String.format("%02x", point.x & 0xFF) + String.format("%02x", point.x >> 8 & 0xFF) + String.format("%02x", point.y & 0xFF) + String.format("%02x", point.y >> 8 & 0xFF) + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 18, 4, 0, point.x & 0xFF, point.x >> 8 & 0xFF, point.y & 0xFF, point.y >> 8 & 0xFF})) + "0D0A" : "5AA5BB00120400" + String.format("%02x", point.x & 0xFF) + String.format("%02x", point.x >> 8 & 0xFF) + String.format("%02x", point.y & 0xFF) + String.format("%02x", point.y >> 8 & 0xFF) + String.format("%02x", 209 + (point.x & 0xFF) + (point.x >> 8 & 0xFF) + (point.y & 0xFF) + (point.y >> 8 & 0xFF) & 0xFF) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void setMachineLimit(boolean bl, IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB00180100" + (bl ? "01" : "00") + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 24, 1, 0, bl ? 1 : 0})) + "0D0A" : "5AA5BB00180100" + (bl ? "01" : "00") + String.format("%02x", 212 + (bl ? 1 : 0)) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void setMachineAutoPager(boolean bl, IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB00220100" + (bl ? "01" : "00") + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 34, 1, 0, bl ? 1 : 0})) + "0D0A" : "5AA5BB00220100" + (bl ? "01" : "00") + String.format("%02x", 221 + (bl ? 1 : 0) + 1) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void setMachineAutoSpace(int n2, IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB00340200" + String.format("%02x", n2 & 0xFF) + String.format("%02x", n2 >> 8 & 0xFF) + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 52, 2, 0, n2 & 0xFF, n2 >> 8 & 0xFF})) + "0D0A" : "5AA5BB00340200" + String.format("%02x", n2 & 0xFF) + String.format("%02x", n2 >> 8 & 0xFF) + String.format("%02x", 241 + (n2 & 0xFF) + (n2 >> 8 & 0xFF) & 0xFF) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void testMachine(IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5bb00170000" + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 23, 0, 0})) + "0D0A" : "5AA5bb00170000D20D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void cutFile(String string, String string2, int n2, int n3, int n4, int n5, boolean bl, boolean bl2, int n6, boolean bl3, IBleCutProgressCallBack iBleCutProgressCallBack) {
        if (!this.isConnected()) {
            iBleCutProgressCallBack.onError(27);
            return;
        }
        this.l = this.a(string2, string, n2, n3, n4, n5, bl, bl2, n6, bl3);
        this.n = iBleCutProgressCallBack;
        this.m = 0;
        this.b(this.l.get(this.m));
    }

    @Override
    public void cutFile(String string, String string2, boolean bl, IBleCutProgressCallBack iBleCutProgressCallBack) {
        if (!this.isConnected()) {
            iBleCutProgressCallBack.onError(27);
            return;
        }
        this.l = this.a(string2, string, bl);
        this.n = iBleCutProgressCallBack;
        this.m = 0;
        this.b(this.l.get(this.m));
    }

    @Override
    public void startOutPager(IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB00240100" + String.format("%02x", 1) + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 36, 1, 0, 1})) + "0D0A" : "5AA5BB00240100" + String.format("%02x", 1) + String.format("%02x", 225) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void endOutPager(IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB00240100" + String.format("%02x", 2) + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 36, 1, 0, 2})) + "0D0A" : "5AA5BB00240100" + String.format("%02x", 2) + String.format("%02x", 226) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public String machineVersion() {
        return this.t;
    }

    @Override
    public boolean isConnected() {
        if (this.g == null || this.t == null) {
            return false;
        }
        return this.c.b(this.g) == 2;
    }

    @Override
    public void disConnected() {
        if (this.g != null && !this.g.isEmpty()) {
            this.c.a(this.g);
        }
    }

    @Override
    public void registerConnectListener(IBluetoothConnector iBluetoothConnector) {
        if (!this.o.contains(iBluetoothConnector)) {
            this.o.add(iBluetoothConnector);
        }
    }

    @Override
    public void unRegisterConnectListener(IBluetoothConnector iBluetoothConnector) {
        if (this.o.contains(iBluetoothConnector)) {
            this.o.remove(iBluetoothConnector);
        }
    }

    private void a(String string, final IBleValueResultCallBack iBleValueResultCallBack) {
        if (this.g == null) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        if (this.c.b(this.g) != 2) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        this.c.b(this.g, UUID_SERVICE, UUID_WRITE_DATA_RECEIVE, Arrays.hexStrToByteArray(string), new j(){

            @Override
            public void a(int n2) {
                if (n2 == 0) {
                    BluetoothSDK.this.p = iBleValueResultCallBack;
                    BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.y);
                    BluetoothSDK.this.a.postDelayed(BluetoothSDK.this.y, 5000L);
                } else {
                    iBleValueResultCallBack.onError(24);
                }
            }
        });
    }

    private void a(String string, final IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        if (this.g == null) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        if (this.c.b(this.g) != 2) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        this.c.b(this.g, UUID_SERVICE, UUID_WRITE_DATA_RECEIVE, Arrays.hexStrToByteArray(string), new j(){

            @Override
            public void a(int n2) {
                if (n2 == 0) {
                    BluetoothSDK.this.q = iBleDefaultResultCallBack;
                    BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.z);
                    BluetoothSDK.this.a.postDelayed(BluetoothSDK.this.z, 5000L);
                } else {
                    iBleDefaultResultCallBack.onError(24);
                }
            }
        });
    }

    private void b(String string) {
        if (this.g == null) {
            this.n.onError(27);
            this.n = null;
            return;
        }
        if (this.c.b(this.g) != 2) {
            this.n.onError(27);
            this.n = null;
            return;
        }
        this.c.b(this.g, UUID_SERVICE, UUID_WRITE_DATA_RECEIVE, Arrays.hexStrToByteArray(string), new j(){

            @Override
            public void a(int n2) {
                if (n2 == 0) {
                    BluetoothSDK.this.a.removeCallbacks(BluetoothSDK.this.A);
                    BluetoothSDK.this.a.postDelayed(BluetoothSDK.this.A, 5000L);
                } else {
                    BluetoothSDK.this.n.onError(24);
                }
            }
        });
    }

    private boolean a(byte[] byArray, int n2) {
        byte by = 0;
        for (int i2 = 0; i2 < n2; ++i2) {
            if (i2 <= 1 || i2 >= n2 - 3) continue;
            by = (byte)(by + byArray[i2]);
        }
        return by == byArray[n2 - 3];
    }

    private List<String> a(String string, String string2, boolean bl) {
        ArrayList<String> arrayList = new ArrayList<String>();
        String string3 = string2;
        if (string.contains(".blt")) {
            try {
                string3 = Arrays.decrypt(string3, "abcd1234");
            }
            catch (Exception exception) {
                exception.printStackTrace();
            }
        }
        string3 = this.a(string3, bl);
        byte[] byArray = Arrays.Arrlist2Arr(Arrays.ConvertString(string3, string3.length()));
        int[] nArray = Arrays.convertNumber2(string3.length());
        ArrayList<Integer> arrayList2 = Arrays.ConvertString("test", 16);
        String string4 = "5AA5CC01301400" + String.format("%02x", nArray[0]) + String.format("%02x", nArray[1]) + String.format("%02x", nArray[2]) + String.format("%02x", nArray[3]) + String.format("%02x", arrayList2.get(0)) + String.format("%02x", arrayList2.get(1)) + String.format("%02x", arrayList2.get(2)) + String.format("%02x", arrayList2.get(3)) + String.format("%02x", arrayList2.get(4)) + String.format("%02x", arrayList2.get(5)) + String.format("%02x", arrayList2.get(6)) + String.format("%02x", arrayList2.get(7)) + String.format("%02x", arrayList2.get(8)) + String.format("%02x", arrayList2.get(9)) + String.format("%02x", arrayList2.get(10)) + String.format("%02x", arrayList2.get(11)) + String.format("%02x", arrayList2.get(12)) + String.format("%02x", arrayList2.get(13)) + String.format("%02x", arrayList2.get(14)) + String.format("%02x", arrayList2.get(15)) + (this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? Arrays.byteArrayToHexStr(this.a(new int[]{204, 1, 48, 20, 0, nArray[0], nArray[1], nArray[2], nArray[3], arrayList2.get(0), arrayList2.get(1), arrayList2.get(2), arrayList2.get(3), arrayList2.get(4), arrayList2.get(5), arrayList2.get(6), arrayList2.get(7), arrayList2.get(8), arrayList2.get(9), arrayList2.get(10), arrayList2.get(11), arrayList2.get(12), arrayList2.get(13), arrayList2.get(14), arrayList2.get(15)})) : String.format("%02x", 273 + nArray[0] + nArray[1] + nArray[2] + nArray[3] + arrayList2.get(0) + arrayList2.get(1) + arrayList2.get(2) + arrayList2.get(3) + arrayList2.get(4) + arrayList2.get(5) + arrayList2.get(6) + arrayList2.get(7) + arrayList2.get(8) + arrayList2.get(9) + arrayList2.get(10) + arrayList2.get(11) + arrayList2.get(12) + arrayList2.get(13) + arrayList2.get(14) + arrayList2.get(15) & 0xFF)) + "0D0A";
        arrayList.add(string4);
        String string5 = Arrays.byteArrayToHexStr(byArray);
        List<String> list = Arrays.cutStrList(string5, 780);
        for (int i2 = 0; i2 < list.size(); ++i2) {
            int n2 = list.get(i2).length() / 2;
            String string6 = "";
            string6 = i2 == list.size() - 1 ? "00" : String.format("%02x", i2 + 2 > 255 ? i2 + 2 * (i2 / 253) - 255 + 1 : i2 + 2);
            String string7 = String.format("%02x", n2 & 0xFF);
            String string8 = String.format("%02x", n2 >> 8 & 0xFF);
            arrayList.add("5AA5CC" + string6 + "30" + string7 + string8 + list.get(i2));
        }
        return arrayList;
    }

    private List<String> a(String string, String string2, int n2, int n3, int n4, int n5, boolean bl, boolean bl2, int n6, boolean bl3) {
        ArrayList<String> arrayList = new ArrayList<String>();
        String string3 = string2;
        if (string.contains(".blt")) {
            try {
                string3 = Arrays.decrypt(string3, "abcd1234");
            }
            catch (Exception exception) {
                exception.printStackTrace();
            }
        }
        string3 = this.a(string3, n2, n3, n4, n5, bl, bl2, n6, bl3);
        byte[] byArray = Arrays.Arrlist2Arr(Arrays.ConvertString(string3, string3.length()));
        int[] nArray = Arrays.convertNumber2(string3.length());
        ArrayList<Integer> arrayList2 = Arrays.ConvertString("test", 16);
        String string4 = "5AA5CC01301400" + String.format("%02x", nArray[0]) + String.format("%02x", nArray[1]) + String.format("%02x", nArray[2]) + String.format("%02x", nArray[3]) + String.format("%02x", arrayList2.get(0)) + String.format("%02x", arrayList2.get(1)) + String.format("%02x", arrayList2.get(2)) + String.format("%02x", arrayList2.get(3)) + String.format("%02x", arrayList2.get(4)) + String.format("%02x", arrayList2.get(5)) + String.format("%02x", arrayList2.get(6)) + String.format("%02x", arrayList2.get(7)) + String.format("%02x", arrayList2.get(8)) + String.format("%02x", arrayList2.get(9)) + String.format("%02x", arrayList2.get(10)) + String.format("%02x", arrayList2.get(11)) + String.format("%02x", arrayList2.get(12)) + String.format("%02x", arrayList2.get(13)) + String.format("%02x", arrayList2.get(14)) + String.format("%02x", arrayList2.get(15)) + (this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? Arrays.byteArrayToHexStr(this.a(new int[]{204, 1, 48, 20, 0, nArray[0], nArray[1], nArray[2], nArray[3], arrayList2.get(0), arrayList2.get(1), arrayList2.get(2), arrayList2.get(3), arrayList2.get(4), arrayList2.get(5), arrayList2.get(6), arrayList2.get(7), arrayList2.get(8), arrayList2.get(9), arrayList2.get(10), arrayList2.get(11), arrayList2.get(12), arrayList2.get(13), arrayList2.get(14), arrayList2.get(15)})) : String.format("%02x", 273 + nArray[0] + nArray[1] + nArray[2] + nArray[3] + arrayList2.get(0) + arrayList2.get(1) + arrayList2.get(2) + arrayList2.get(3) + arrayList2.get(4) + arrayList2.get(5) + arrayList2.get(6) + arrayList2.get(7) + arrayList2.get(8) + arrayList2.get(9) + arrayList2.get(10) + arrayList2.get(11) + arrayList2.get(12) + arrayList2.get(13) + arrayList2.get(14) + arrayList2.get(15) & 0xFF)) + "0D0A";
        arrayList.add(string4);
        String string5 = Arrays.byteArrayToHexStr(byArray);
        List<String> list = Arrays.cutStrList(string5, 780);
        for (int i2 = 0; i2 < list.size(); ++i2) {
            int n7 = list.get(i2).length() / 2;
            String string6 = "";
            string6 = i2 == list.size() - 1 ? "00" : String.format("%02x", i2 + 2 > 255 ? i2 + 2 * (i2 / 253) - 255 + 1 : i2 + 2);
            String string7 = String.format("%02x", n7 & 0xFF);
            String string8 = String.format("%02x", n7 >> 8 & 0xFF);
            arrayList.add("5AA5CC" + string6 + "30" + string7 + string8 + list.get(i2));
        }
        return arrayList;
    }

    private String a(String string, boolean bl) {
        Object object;
        String[] stringArray;
        String[] stringArray2 = string.split(";");
        ArrayList<Object> arrayList = new ArrayList<Object>();
        for (int i2 = 0; i2 < stringArray2.length; ++i2) {
            String string2 = stringArray2[i2];
            if (string2.isEmpty() || (stringArray = string2.split(",")).length < 2) continue;
            object = null;
            if (stringArray[0].contains("PU")) {
                object = new d(com.inuker.bluetooth.library.cc.d.a);
            } else if (stringArray[0].contains("PD")) {
                object = new d(com.inuker.bluetooth.library.cc.d.b);
            }
            if (object == null) continue;
            this.a((d)object, stringArray);
            arrayList.add(object);
        }
        StringBuffer stringBuffer = new StringBuffer();
        stringBuffer.append("IN;PA;");
        for (int i3 = 0; i3 < arrayList.size(); ++i3) {
            stringArray = (d)arrayList.get(i3);
            object = "PU";
            if (stringArray.e == com.inuker.bluetooth.library.cc.d.b) {
                object = "PD";
            }
            for (int i4 = 0; i4 < stringArray.c.size(); ++i4) {
                if (((String)object).equals("PU")) {
                    if (bl) {
                        if (i4 == 0 && i3 == 0) {
                            int n2 = stringArray.c.get(i4);
                            int n3 = stringArray.d.get(i4);
                            if (n2 > 2000 || n3 > 2000) {
                                int n4 = n2 / 3;
                                int n5 = n3 / 3;
                                stringBuffer.append((String)object + Integer.valueOf(n4) + "," + Integer.valueOf(n5) + ";");
                                stringBuffer.append((String)object + Integer.valueOf(n4 * 2) + "," + Integer.valueOf(n5 * 2) + ";");
                                stringBuffer.append((String)object + Integer.valueOf(n2) + "," + Integer.valueOf(n3) + ";");
                                continue;
                            }
                            stringBuffer.append((String)object + stringArray.c.get(i4) + "," + stringArray.d.get(i4) + ";");
                            continue;
                        }
                        stringBuffer.append((String)object + stringArray.c.get(i4) + "," + stringArray.d.get(i4) + ";");
                        continue;
                    }
                    stringBuffer.append((String)object + stringArray.c.get(i4) + "," + stringArray.d.get(i4) + ";");
                    continue;
                }
                stringBuffer.append((String)object + stringArray.c.get(i4) + "," + stringArray.d.get(i4) + ";");
            }
        }
        stringBuffer.append(";PG;");
        return stringBuffer.toString();
    }

    /*
     * WARNING - void declaration
     */
    private String a(String string, int n2, int n3, int n4, int n5, boolean bl, boolean bl2, double d2, boolean bl3) {
        String string2;
        Object object2;
        Object object3;
        String[] stringArray = string.split(";");
        ArrayList<d> arrayList = new ArrayList<d>();
        for (int i2 = 0; i2 < stringArray.length; ++i2) {
            void object4;
            object3 = stringArray[i2];
            if (((String)object3).isEmpty() || ((String[])(object2 = ((String)object3).split(","))).length < 2) continue;
            Object var16_17 = null;
            if (((String)object2[0]).contains("PU")) {
                d d3 = new d(com.inuker.bluetooth.library.cc.d.a);
            } else if (((String)object2[0]).contains("PD")) {
                d d4 = new d(com.inuker.bluetooth.library.cc.d.b);
            }
            if (object4 == null) continue;
            this.a((d)object4, (String[])object2);
            arrayList.add((d)object4);
        }
        ArrayList<Integer> arrayList2 = new ArrayList<Integer>();
        object3 = new ArrayList();
        for (d d5 : arrayList) {
            arrayList2.addAll(d5.c);
            object3.addAll(d5.d);
        }
        object2 = this.a(arrayList2, (List<Integer>)object3);
        this.a(n2, n3, n4, n5, bl, bl2, arrayList);
        for (d d6 : arrayList) {
            for (int i2 = 0; i2 < d6.c.size(); ++i2) {
                string2 = this.a((Point)object2, new Point(d6.c.get(i2).intValue(), d6.d.get(i2).intValue()), d2);
                d6.c.set(i2, ((Point)string2).x);
                d6.d.set(i2, ((Point)string2).y);
            }
        }
        this.a(n2, n3, n4, n5, arrayList);
        StringBuffer stringBuffer = new StringBuffer();
        stringBuffer.append("IN;PA;");
        for (int i3 = 0; i3 < arrayList.size(); ++i3) {
            d d7 = (d)arrayList.get(i3);
            string2 = "PU";
            if (d7.e == com.inuker.bluetooth.library.cc.d.b) {
                string2 = "PD";
            }
            for (int i4 = 0; i4 < d7.c.size(); ++i4) {
                if (string2.equals("PU")) {
                    if (bl3) {
                        if (i4 == 0 && i3 == 0) {
                            int n6 = d7.c.get(i4);
                            int n7 = d7.d.get(i4);
                            if (n6 > 2000 || n7 > 2000) {
                                int n8 = n6 / 3;
                                int n9 = n7 / 3;
                                stringBuffer.append(string2 + Integer.valueOf(n8) + "," + Integer.valueOf(n9) + ";");
                                stringBuffer.append(string2 + Integer.valueOf(n8 * 2) + "," + Integer.valueOf(n9 * 2) + ";");
                                stringBuffer.append(string2 + Integer.valueOf(n6) + "," + Integer.valueOf(n7) + ";");
                                continue;
                            }
                            stringBuffer.append(string2 + d7.c.get(i4) + "," + d7.d.get(i4) + ";");
                            continue;
                        }
                        stringBuffer.append(string2 + d7.c.get(i4) + "," + d7.d.get(i4) + ";");
                        continue;
                    }
                    stringBuffer.append(string2 + d7.c.get(i4) + "," + d7.d.get(i4) + ";");
                    continue;
                }
                stringBuffer.append(string2 + d7.c.get(i4) + "," + d7.d.get(i4) + ";");
            }
        }
        stringBuffer.append(";PG;");
        return stringBuffer.toString();
    }

    private void a(int n2, int n3, int n4, int n5, List<d> list) {
        int n6;
        int n7;
        ArrayList<Integer> arrayList = new ArrayList<Integer>();
        ArrayList<Integer> arrayList2 = new ArrayList<Integer>();
        for (d d2 : list) {
            arrayList.addAll(d2.c);
            arrayList2.addAll(d2.d);
        }
        int n8 = this.b(arrayList);
        int n9 = this.a(arrayList);
        int n10 = this.b(arrayList2);
        int n11 = this.a(arrayList2);
        if (n8 < 0) {
            for (int i2 = 0; i2 < arrayList.size(); ++i2) {
                arrayList.set(i2, (Integer)arrayList.get(i2) + -n8);
            }
            for (d d3 : list) {
                for (n7 = 0; n7 < d3.c.size(); ++n7) {
                    n6 = d3.c.get(n7);
                    d3.c.set(n7, n6 + -n8);
                }
            }
            n8 = this.b(arrayList);
            n9 = this.a(arrayList);
        } else if (n8 > 0) {
            for (int i3 = 0; i3 < arrayList.size(); ++i3) {
                arrayList.set(i3, (Integer)arrayList.get(i3) - n8);
            }
            for (d d3 : list) {
                for (n7 = 0; n7 < d3.c.size(); ++n7) {
                    n6 = d3.c.get(n7);
                    d3.c.set(n7, n6 - n8);
                }
            }
            n8 = this.b(arrayList);
            n9 = this.a(arrayList);
        }
        if (n10 < 0) {
            for (int i4 = 0; i4 < arrayList2.size(); ++i4) {
                arrayList2.set(i4, (Integer)arrayList2.get(i4) + -n10);
            }
            for (d d3 : list) {
                for (n7 = 0; n7 < d3.d.size(); ++n7) {
                    n6 = d3.d.get(n7);
                    d3.d.set(n7, n6 + -n10);
                }
            }
            n10 = this.b(arrayList2);
            n11 = this.a(arrayList2);
        } else if (n10 > 0) {
            for (int i5 = 0; i5 < arrayList2.size(); ++i5) {
                arrayList2.set(i5, (Integer)arrayList2.get(i5) - n10);
            }
            for (d d3 : list) {
                for (n7 = 0; n7 < d3.d.size(); ++n7) {
                    n6 = d3.d.get(n7);
                    d3.d.set(n7, n6 - n10);
                }
            }
            n10 = this.b(arrayList2);
            n11 = this.a(arrayList2);
        }
        int n12 = StrictMath.abs(n11 - n10);
        int n13 = StrictMath.abs(n9 - n8);
        n7 = n4 * 40;
        n6 = n5 * 40;
        int n14 = (n7 - n12) / 2 - n10 - n3;
        int n15 = (n6 - n13) / 2 - n8 - n2;
        for (d d4 : list) {
            int n16;
            int n17;
            for (n17 = 0; n17 < d4.c.size(); ++n17) {
                n16 = d4.c.get(n17);
                d4.c.set(n17, n16 + n15);
            }
            for (n17 = 0; n17 < d4.d.size(); ++n17) {
                n16 = d4.d.get(n17);
                d4.d.set(n17, n16 + n14);
            }
        }
    }

    private void a(int n2, int n3, int n4, int n5, boolean bl, boolean bl2, List<d> list) {
        int n6;
        int n7;
        ArrayList<Integer> arrayList = new ArrayList<Integer>();
        ArrayList<Integer> arrayList2 = new ArrayList<Integer>();
        for (d d2 : list) {
            arrayList.addAll(d2.c);
            arrayList2.addAll(d2.d);
        }
        int n8 = this.b(arrayList);
        int n9 = this.a(arrayList);
        int n10 = this.b(arrayList2);
        int n11 = this.a(arrayList2);
        if (n8 < 0) {
            for (int i2 = 0; i2 < arrayList.size(); ++i2) {
                arrayList.set(i2, (Integer)arrayList.get(i2) + -n8);
            }
            for (d d3 : list) {
                for (n7 = 0; n7 < d3.c.size(); ++n7) {
                    n6 = d3.c.get(n7);
                    d3.c.set(n7, n6 + -n8);
                }
            }
            n8 = this.b(arrayList);
            n9 = this.a(arrayList);
        } else if (n8 > 0) {
            for (int i3 = 0; i3 < arrayList.size(); ++i3) {
                arrayList.set(i3, (Integer)arrayList.get(i3) - n8);
            }
            for (d d3 : list) {
                for (n7 = 0; n7 < d3.c.size(); ++n7) {
                    n6 = d3.c.get(n7);
                    d3.c.set(n7, n6 - n8);
                }
            }
            n8 = this.b(arrayList);
            n9 = this.a(arrayList);
        }
        if (n10 < 0) {
            for (int i4 = 0; i4 < arrayList2.size(); ++i4) {
                arrayList2.set(i4, (Integer)arrayList2.get(i4) + -n10);
            }
            for (d d3 : list) {
                for (n7 = 0; n7 < d3.d.size(); ++n7) {
                    n6 = d3.d.get(n7);
                    d3.d.set(n7, n6 + -n10);
                }
            }
            n10 = this.b(arrayList2);
            n11 = this.a(arrayList2);
        } else if (n10 > 0) {
            for (int i5 = 0; i5 < arrayList2.size(); ++i5) {
                arrayList2.set(i5, (Integer)arrayList2.get(i5) - n10);
            }
            for (d d3 : list) {
                for (n7 = 0; n7 < d3.d.size(); ++n7) {
                    n6 = d3.d.get(n7);
                    d3.d.set(n7, n6 - n10);
                }
            }
            n10 = this.b(arrayList2);
            n11 = this.a(arrayList2);
        }
        int n12 = StrictMath.abs(n11 - n10);
        int n13 = StrictMath.abs(n9 - n8);
        n7 = n4 * 40;
        n6 = n5 * 40;
        int n14 = (n7 - n12) / 2 - n10 - n3;
        int n15 = (n6 - n13) / 2 - n8 - n2;
        for (d d4 : list) {
            int n16;
            int n17;
            for (n17 = 0; n17 < d4.c.size(); ++n17) {
                n16 = d4.c.get(n17);
                d4.c.set(n17, bl ? n9 - n16 + n15 : n16 + n15);
            }
            for (n17 = 0; n17 < d4.d.size(); ++n17) {
                n16 = d4.d.get(n17);
                d4.d.set(n17, bl2 ? n11 - n16 + n14 : n16 + n14);
            }
        }
    }

    private Point a(Point point, Point point2, double d2) {
        Point point3 = new Point();
        double d3 = d2 * Math.PI / 180.0;
        double d4 = (double)(point2.x - point.x) * Math.cos(d3) + (double)(point2.y - point.y) * Math.sin(d3) + (double)point.x;
        double d5 = (double)(-(point2.x - point.x)) * Math.sin(d3) + (double)(point2.y - point.y) * Math.cos(d3) + (double)point.y;
        point3.x = (int)d4;
        point3.y = (int)d5;
        return point3;
    }

    private Point a(List<Integer> list, List<Integer> list2) {
        Integer[] integerArray = list.toArray(new Integer[list.size()]);
        Integer[] integerArray2 = list2.toArray(new Integer[list2.size()]);
        int n2 = integerArray[0];
        int n3 = integerArray[0];
        int n4 = integerArray2[0];
        int n5 = integerArray2[0];
        int n6 = integerArray.length;
        for (int i2 = 1; i2 < n6; ++i2) {
            int n7;
            int n8;
            int n9;
            int n10;
            int n11 = integerArray[i2 - 1];
            int n12 = integerArray2[i2 - 1];
            if (n11 <= integerArray[i2]) {
                n10 = n11;
                n9 = integerArray[i2];
            } else {
                n10 = integerArray[i2];
                n9 = n11;
            }
            if (n12 <= integerArray2[i2]) {
                n8 = n12;
                n7 = integerArray2[i2];
            } else {
                n8 = integerArray2[i2];
                n7 = n12;
            }
            n2 = Math.min(n2, n10);
            n3 = StrictMath.max(n3, n9);
            n4 = Math.min(n4, n8);
            n5 = StrictMath.max(n5, n7);
        }
        int n13 = StrictMath.abs(n5 - n4);
        int n14 = StrictMath.abs(n3 - n2);
        return new Point(n14 / 2, n13 / 2);
    }

    private int a(List<Integer> list) {
        int n2 = list.get(0);
        for (int i2 = 1; i2 < list.size(); ++i2) {
            if (n2 >= list.get(i2)) continue;
            n2 = list.get(i2);
        }
        return n2;
    }

    private int b(List<Integer> list) {
        int n2 = list.get(0);
        for (int i2 = 1; i2 < list.size(); ++i2) {
            if (n2 <= list.get(i2)) continue;
            n2 = list.get(i2);
        }
        return n2;
    }

    public boolean isContainsLetter(String string) {
        Matcher matcher = Pattern.compile(".*[a-zA-Z]+.*").matcher(string);
        return matcher.matches();
    }

    public boolean isNumeric(String string) {
        Pattern pattern = Pattern.compile("[0-9]*");
        Matcher matcher = pattern.matcher(string);
        return matcher.matches();
    }

    private void a(d d2, String[] stringArray) {
        for (int i2 = 0; i2 < stringArray.length; ++i2) {
            if (i2 == 0) {
                d2.c.add(Integer.valueOf(stringArray[i2].replace("PD", "").replace("PU", "")));
                continue;
            }
            if (i2 == 1) {
                d2.d.add(Integer.valueOf(stringArray[i2].replace("PD", "").replace("PU", "")));
                continue;
            }
            if (i2 % 2 == 0) {
                d2.c.add(Integer.valueOf(stringArray[i2].replace("PD", "").replace("PU", "")));
                continue;
            }
            d2.d.add(Integer.valueOf(stringArray[i2].replace("PD", "").replace("PU", "")));
        }
    }

    @Override
    public boolean isOpened() {
        return this.c.b();
    }

    @Override
    public boolean openBluetooth() {
        return this.c.c();
    }

    @Override
    public void registerBluetoothStatusListener(BluetoothStateListener bluetoothStateListener) {
        this.c.a(bluetoothStateListener);
    }

    @Override
    public void unRegisterBluetoothStatusListener(BluetoothStateListener bluetoothStateListener) {
        this.c.b(bluetoothStateListener);
    }

    @Override
    public void resetPoint(IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB001B0000" + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 27, 0, 0})) + "0D0A" : "5AA5BB001B0000" + String.format("%02x", 214) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void queryXYPoint(IBleValueResultCallBack<Point> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA00250000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 37, 0, 0})) + "0D0A" : "5AA5AA00250000" + String.format("%02x", 207) + "0D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void setXYPoint(int n2, int n3, IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB00250200" + String.format("%02x", n2) + String.format("%02x", n3) + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 37, 2, 0, n2, n3})) + "0D0A" : "5AA5BB00250200" + String.format("%02x", n2) + String.format("%02x", n3) + String.format("%02x", 226 + n2 + n3 & 0xFF) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void clearXYPoint(IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB00260000" + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 38, 0, 0})) + "0D0A" : "5AA5BB00260000" + String.format("%02x", 225) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void queryCameraCalibration(IBleValueResultCallBack<Point> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA002f0000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 47, 0, 0})) + "0D0A" : "5AA5AA002f0000" + String.format("%02x", 217) + "0D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void calibrationCamera(IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB00270000" + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 39, 0, 0})) + "0D0A" : "5AA5BB00270000" + String.format("%02x", 226) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void queryCameraCalibrationStatus(IBleValueResultCallBack<Integer> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA00320000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 50, 0, 0})) + "0D0A" : "5AA5AA00320000" + String.format("%02x", 220) + "0D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void queryCameraBright(IBleValueResultCallBack<Integer> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA00280000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 40, 0, 0})) + "0D0A" : "5AA5AA00280000" + String.format("%02x", 210) + "0D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void setCameraBright(int n2, IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB00280200" + String.format("%02x", n2 & 0xFF) + String.format("%02x", n2 >> 8 & 0xFF) + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 40, 2, 0, n2 & 0xFF, n2 >> 8 & 0xFF})) + "0D0A" : "5AA5BB00280200" + String.format("%02x", n2 & 0xFF) + String.format("%02x", n2 >> 8 & 0xFF) + String.format("%02x", 229 + (n2 & 0xFF) + (n2 >> 8 & 0xFF) & 0xFF) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void queryXYOffset(IBleValueResultCallBack<Point> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA00290000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 41, 0, 0})) + "0D0A" : "5AA5AA00290000" + String.format("%02x", 211) + "0D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void setXYOffset(Point point, IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB00290400" + String.format("%02x", point.x & 0xFF) + String.format("%02x", point.x >> 8 & 0xFF) + String.format("%02x", point.y & 0xFF) + String.format("%02x", point.y >> 8 & 0xFF) + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 41, 4, 0, point.x & 0xFF, point.x >> 8 & 0xFF, point.y & 0xFF, point.y >> 8 & 0xFF})) + "0D0A" : "5AA5BB00290400" + String.format("%02x", point.x & 0xFF) + String.format("%02x", point.x >> 8 & 0xFF) + String.format("%02x", point.y & 0xFF) + String.format("%02x", point.y >> 8 & 0xFF) + String.format("%02x", 232 + (point.x & 0xFF) + (point.x >> 8 & 0xFF) + (point.y & 0xFF) + (point.y >> 8 & 0xFF) & 0xFF) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void testPressure(IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB002a0000" + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 42, 0, 0})) + "0D0A" : "5AA5BB002a0000" + String.format("%02x", 229) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void reCut(IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB002b0000" + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 43, 0, 0})) + "0D0A" : "5AA5BB002b0000" + String.format("%02x", 230) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void queryUsbFileList(IBleValueResultCallBack<List<String>> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA002C0000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 44, 0, 0})) + "0D0A" : "5AA5AA002C0000" + String.format("%02x", 214) + "0D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void cutUsbFile(int n2, IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5BB002E0200" + String.format("%02x", n2 & 0xFF) + String.format("%02x", n2 >> 8 & 0xFF) + Arrays.byteArrayToHexStr(this.a(new int[]{187, 0, 46, 2, 0, n2 & 0xFF, n2 >> 8 & 0xFF})) + "0D0A" : "5AA5BB002E0200" + String.format("%02x", n2 & 0xFF) + String.format("%02x", n2 >> 8 & 0xFF) + String.format("%02x", 235 + (n2 & 0xFF) + (n2 >> 8 & 0xFF) & 0xFF) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void queryUsbStatus(IBleValueResultCallBack<Integer> iBleValueResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleValueResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5AA00330000" + Arrays.byteArrayToHexStr(this.a(new int[]{170, 0, 51, 0, 0})) + "0D0A" : "5AA5AA00330000" + String.format("%02x", 221) + "0D0A";
        this.a(string, iBleValueResultCallBack);
    }

    @Override
    public void stopCut(IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5CC00410000" + Arrays.byteArrayToHexStr(this.a(new int[]{204, 0, 65, 0, 0})) + "0D0A" : "5AA5CC00410000" + String.format("%02x", 13) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void startCut(IBleDefaultResultCallBack iBleDefaultResultCallBack) {
        String string = null;
        if (!this.isConnected()) {
            iBleDefaultResultCallBack.onError(27);
            return;
        }
        string = this.t.substring(this.t.length() - 1, this.t.length()).equals("C") ? "5AA5CC00400000" + Arrays.byteArrayToHexStr(this.a(new int[]{204, 0, 68, 0, 0})) + "0D0A" : "5AA5CC00400000" + String.format("%02x", 12) + "0D0A";
        this.a(string, iBleDefaultResultCallBack);
    }

    @Override
    public void setBind(String string) {
        this.h = string;
    }

    @Override
    public void clearBind() {
        this.disConnected();
        this.h = null;
    }

    @Override
    public void startAutoConnect() {
        if (this.v == null) {
            this.v = new a();
            this.v.execute(new String[]{""});
        }
    }

    @Override
    public void endAutoConnect() {
        if (this.v != null) {
            this.v.cancel(true);
            this.v = null;
        }
    }

    private byte[] a(int[] nArray) {
        int n2 = nArray.length + f.length;
        byte[] byArray = new byte[n2];
        for (int i2 = 0; i2 < n2; ++i2) {
            if (i2 < nArray.length) {
                byArray[i2] = (byte)nArray[i2];
                continue;
            }
            int n3 = i2 - nArray.length;
            byArray[i2] = f[n3];
        }
        byte[] byArray2 = com.inuker.bluetooth.library.cc.e.a(byArray);
        byte[] byArray3 = new byte[2];
        for (int i3 = 0; i3 < 16; ++i3) {
            byArray3[0] = (byte)(byArray3[0] + byArray2[i3]);
            byArray3[1] = (byte)(byArray3[1] + byArray2[16 + i3]);
        }
        return byArray3;
    }

    private boolean a(byte[] byArray) {
        int[] nArray = new int[byArray.length - 6];
        for (int i2 = 0; i2 < nArray.length; ++i2) {
            nArray[i2] = byArray[i2 + 2];
        }
        byte[] byArray2 = this.a(nArray);
        return byArray2[0] == byArray[byArray.length - 4] && byArray2[1] == byArray[byArray.length - 3];
    }

    static {
        UUID_SERVICE = UUID.fromString("0000fff0-0000-1000-8000-00805f9b34fb");
        UUID_NOTIFY_DATA_RECEIVE = UUID.fromString("0000fff1-0000-1000-8000-00805f9b34fb");
        UUID_WRITE_DATA_RECEIVE = UUID.fromString("0000fff2-0000-1000-8000-00805f9b34fb");
    }

    private class a
    extends AsyncTask<String, Integer, String> {
        private a() {
        }

        protected void onPreExecute() {
        }

        protected String a(String ... stringArray) {
            while (!BluetoothSDK.this.x) {
                if (this.isCancelled()) {
                    return null;
                }
                if (BluetoothSDK.this.h == null || BluetoothSDK.this.h.length() == 0) continue;
                if (!BluetoothSDK.this.w) {
                    Log.e((String)"BluetoothSDK", (String)"\u81ea\u52a8\u8fde\u63a5\u5c1d\u8bd5-----");
                    BluetoothSDK.this.w = true;
                    for (IBluetoothConnector iBluetoothConnector : BluetoothSDK.this.o) {
                        iBluetoothConnector.onConnecting();
                    }
                    BluetoothSDK.this.g = BluetoothSDK.this.h;
                    BluetoothSDK.this.c.a(BluetoothSDK.this.g, new a.a().a(1).c(5000).b(1).d(5000).a(), new com.inuker.bluetooth.library.connect.c.a(){

                        @Override
                        public void a(int n2, c c2) {
                            if (n2 == 0) {
                                BluetoothSDK.this.a(BluetoothSDK.this.g);
                            } else {
                                BluetoothSDK.this.w = false;
                            }
                        }
                    });
                }
                try {
                    Thread.sleep(1000L);
                }
                catch (InterruptedException interruptedException) {
                    interruptedException.printStackTrace();
                }
            }
            return null;
        }

        protected void a(Integer ... integerArray) {
        }

        protected void a(String string) {
        }

        protected void onCancelled() {
        }

        protected /* synthetic */ void onProgressUpdate(Object[] objectArray) {
            this.a((Integer[])objectArray);
        }

        protected /* synthetic */ void onPostExecute(Object object) {
            this.a((String)object);
        }

        protected /* synthetic */ Object doInBackground(Object[] objectArray) {
            return this.a((String[])objectArray);
        }
    }
}

