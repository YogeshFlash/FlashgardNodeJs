/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.graphics.Point
 */
package com.inuker.bluetooth.library.cc;

import android.graphics.Point;
import com.inuker.bluetooth.library.cc.IBleCutProgressCallBack;
import com.inuker.bluetooth.library.cc.IBleDefaultResultCallBack;
import com.inuker.bluetooth.library.cc.IBleValueResultCallBack;
import com.inuker.bluetooth.library.cc.IBluetoothConnector;
import com.inuker.bluetooth.library.cc.listener.IBluetoothConnectListener;
import com.inuker.bluetooth.library.cc.listener.IBluetoothSearchListener;
import com.inuker.bluetooth.library.connect.listener.BluetoothStateListener;
import com.inuker.bluetooth.library.search.SearchResult;
import java.util.List;

public interface IBluetoothSDK {
    public void search(int var1, IBluetoothSearchListener var2);

    public void stopSearch();

    public void connect(SearchResult var1, IBluetoothConnectListener var2);

    public void connect(String var1, IBluetoothConnectListener var2);

    public void queryMachineCode(IBleValueResultCallBack<String> var1);

    public void queryMachinePressure(IBleValueResultCallBack<Integer> var1);

    public void queryMachineSpeed(IBleValueResultCallBack<Integer> var1);

    public void queryMachineWide(IBleValueResultCallBack<Integer> var1);

    public void queryMachineGear(IBleValueResultCallBack<Point> var1);

    public void queryMachineLimit(IBleValueResultCallBack<Boolean> var1);

    public void queryMachineVersion(IBleValueResultCallBack<String> var1);

    public void queryMachineStatus(IBleValueResultCallBack<Integer> var1);

    public void queryMachineAutoPager(IBleValueResultCallBack<Boolean> var1);

    public void queryMachineAutoSpace(IBleValueResultCallBack<Integer> var1);

    public void setMachinePressure(int var1, IBleDefaultResultCallBack var2);

    public void setMachineSpeed(int var1, IBleDefaultResultCallBack var2);

    public void setMachineWide(int var1, IBleDefaultResultCallBack var2);

    public void setMachineGear(Point var1, IBleDefaultResultCallBack var2);

    public void setMachineLimit(boolean var1, IBleDefaultResultCallBack var2);

    public void setMachineAutoPager(boolean var1, IBleDefaultResultCallBack var2);

    public void setMachineAutoSpace(int var1, IBleDefaultResultCallBack var2);

    public void testMachine(IBleDefaultResultCallBack var1);

    public void cutFile(String var1, String var2, int var3, int var4, int var5, int var6, boolean var7, boolean var8, int var9, boolean var10, IBleCutProgressCallBack var11);

    public void cutFile(String var1, String var2, boolean var3, IBleCutProgressCallBack var4);

    public void startOutPager(IBleDefaultResultCallBack var1);

    public void endOutPager(IBleDefaultResultCallBack var1);

    public String machineVersion();

    public boolean isConnected();

    public void disConnected();

    public boolean isOpened();

    public boolean openBluetooth();

    public void setBind(String var1);

    public void clearBind();

    public void startAutoConnect();

    public void endAutoConnect();

    public void registerConnectListener(IBluetoothConnector var1);

    public void unRegisterConnectListener(IBluetoothConnector var1);

    public void registerBluetoothStatusListener(BluetoothStateListener var1);

    public void unRegisterBluetoothStatusListener(BluetoothStateListener var1);

    public void resetPoint(IBleDefaultResultCallBack var1);

    public void queryXYPoint(IBleValueResultCallBack<Point> var1);

    public void setXYPoint(int var1, int var2, IBleDefaultResultCallBack var3);

    public void clearXYPoint(IBleDefaultResultCallBack var1);

    public void queryCameraCalibration(IBleValueResultCallBack<Point> var1);

    public void calibrationCamera(IBleDefaultResultCallBack var1);

    public void queryCameraCalibrationStatus(IBleValueResultCallBack<Integer> var1);

    public void queryCameraBright(IBleValueResultCallBack<Integer> var1);

    public void setCameraBright(int var1, IBleDefaultResultCallBack var2);

    public void queryXYOffset(IBleValueResultCallBack<Point> var1);

    public void setXYOffset(Point var1, IBleDefaultResultCallBack var2);

    public void testPressure(IBleDefaultResultCallBack var1);

    public void reCut(IBleDefaultResultCallBack var1);

    public void queryUsbFileList(IBleValueResultCallBack<List<String>> var1);

    public void cutUsbFile(int var1, IBleDefaultResultCallBack var2);

    public void queryUsbStatus(IBleValueResultCallBack<Integer> var1);

    public void stopCut(IBleDefaultResultCallBack var1);

    public void startCut(IBleDefaultResultCallBack var1);
}

